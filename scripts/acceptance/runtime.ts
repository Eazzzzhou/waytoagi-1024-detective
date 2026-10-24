import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { createQueueTestDatabase } from "../../tests/support/database";
import { AcceptedInvestigationSchema, ApiErrorResponseSchema, InvestigationDetailSchema } from "../../src/contracts";
import { classifyFailure } from "../../src/server/queue/errors";

async function freePort() {
  const listener = createServer(); listener.listen(0, "127.0.0.1"); await once(listener, "listening");
  const address = listener.address(); assert(address && typeof address === "object");
  const port = address.port; await new Promise<void>((resolve) => listener.close(() => resolve())); return port;
}
function launch(args: string[], env: NodeJS.ProcessEnv, ipc = false) {
  const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ipc ? ["ignore", "pipe", "pipe", "ipc"] : ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout?.on("data", (data: Buffer) => { output = (output + data.toString()).slice(-16000); });
  child.stderr?.on("data", (data: Buffer) => { output = (output + data.toString()).slice(-16000); });
  const exited = once(child, "exit");
  return { child, exited, output: () => output };
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit"); child.kill();
  await Promise.race([exited, delay(5000).then(() => { throw new Error("Child process did not stop within 5s"); })]);
}
async function waitUntil(check: () => Promise<boolean>, message: string) {
  for (let attempt = 0; attempt < 150; attempt++) { if (await check()) return; await delay(100); }
  throw new Error(message);
}

const database = await createQueueTestDatabase({ migrateWithPrisma: true });
const checks: string[] = [];
let web: ReturnType<typeof launch> | undefined;
let worker: ReturnType<typeof launch> | undefined;
let badConfigWeb: ReturnType<typeof launch> | undefined;
let failure: unknown;
try {
  const migration = await database.pool.query<{ count: string }>('SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  assert.equal(Number(migration.rows[0]!.count), 4);
  checks.push("fresh_schema_prisma_migrate_deploy");
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  web = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { ...process.env, DATABASE_URL: database.connectionString });
  await waitUntil(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, "Production Web did not become ready");
  checks.push("production_web_start");
  const key = randomUUID();
  const submit = () => fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, "Idempotency-Key": key }, body: JSON.stringify({ question: "公共工程隔离验收：缺少提供方时保存明确失败" }) });
  const response = await submit(); assert.equal(response.status, 202);
  const created = AcceptedInvestigationSchema.parse(await response.json());
  const repeated = await submit(); assert.equal(repeated.status, 202);
  assert.equal(AcceptedInvestigationSchema.parse(await repeated.json()).investigationId, created.investigationId);
  const read = async () => InvestigationDetailSchema.parse(await (await fetch(`${base}/api/investigations/${created.investigationId}`)).json());
  assert.equal((await read()).investigation.status, "PENDING");
  checks.push("real_http_enqueue", "idempotent_network_submission");

  worker = launch(["--import", "tsx", "tests/support/worker-process.ts"], { ...process.env, DATABASE_URL: database.connectionString, WORKER_POLL_MS: "50", WORKER_LEASE_MS: "2000", WORKER_HEARTBEAT_MS: "200", WORKER_TIMEOUT_MS: "3000", WORKER_SHUTDOWN_GRACE_MS: "2000" }, true);
  await waitUntil(async () => (await read()).investigation.status === "FAILED", "Production Worker did not record a terminal error");
  for (let count = 0; count < 2; count++) {
    const state = await read(); assert.equal(state.investigation.error?.code, "PROVIDER_NOT_CONFIGURED"); assert.equal(state.investigation.resultSnapshotId, null);
    assert(!JSON.stringify(state).includes("executionToken"));
  }
  assert.equal(await database.db.executionAttempt.count(), 1);
  assert.equal(await database.db.evidenceSnapshot.count(), 0);
  checks.push("real_worker_claim", "provider_not_configured", "fresh_api_reads_preserve_failure", "no_synthetic_result");
  worker.child.send("shutdown");
  const [code] = await Promise.race([worker.exited, delay(5000).then(() => { throw new Error("Worker did not shut down gracefully"); })]);
  assert.equal(code, 0); assert(worker.output().includes('"event":"worker.stopped"'));
  checks.push("independent_worker_graceful_shutdown");

  const wrongMethod = await fetch(`${base}/api/investigations`);
  assert.equal(wrongMethod.status, 405); ApiErrorResponseSchema.parse(await wrongMethod.json());
  const missingSnapshot = await fetch(`${base}/api/snapshots/${randomUUID()}`);
  assert.equal(missingSnapshot.status, 404); ApiErrorResponseSchema.parse(await missingSnapshot.json());
  checks.push("network_json_405", "network_json_404");

  const badPort = await freePort();
  const badBase = `http://127.0.0.1:${badPort}`;
  badConfigWeb = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(badPort)], { ...process.env, DATABASE_URL: "invalid-config-secret-sentinel" });
  await waitUntil(async () => { try { return (await fetch(badBase)).ok; } catch { return false; } }, "Configuration-error Web did not become ready");
  const bad = await fetch(`${badBase}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(bad.status, 503);
  const badBody = await bad.text(); assert(!badBody.includes("invalid-config-secret-sentinel")); ApiErrorResponseSchema.parse(JSON.parse(badBody));
  checks.push("network_configuration_error_is_safe_json");
} catch (error) { failure = error; }
finally {
  for (const entry of [worker, web, badConfigWeb]) if (entry) await stop(entry.child);
  await database.close();
}
await mkdir(".cache/acceptance", { recursive: true });
const result = { status: failure ? "failed" : "passed", checks, error: failure ? classifyFailure(failure) : null, isolatedSchemaCleaned: true };
await writeFile(".cache/acceptance/runtime.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (failure) process.exitCode = 1;
