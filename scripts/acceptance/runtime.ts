import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { createQueueTestDatabase } from "../../tests/support/database";
import { AcceptedAdviceRequestSchema, AcceptedInvestigationSchema, AdviceRequestDetailSchema, ApiErrorResponseSchema, InvestigationDetailSchema } from "../../src/contracts";
import { classifyFailure } from "../../src/server/queue/errors";
import { InvestigationRepository } from "../../src/server/storage/repository";
import { makeAnswer, makeSnapshot } from "../../tests/fixtures/snapshot";

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
  const expectedMigrations = (await readdir("prisma/migrations", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const migration = await database.pool.query<{ migration_name: string }>('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
  assert(expectedMigrations.length > 0, "The repository must contain database migrations");
  assert.deepEqual(migration.rows.map((row) => row.migration_name), expectedMigrations);
  checks.push("fresh_schema_prisma_migrate_deploy");
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  web = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { ...process.env, DATABASE_URL: database.connectionString });
  await waitUntil(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, "Production Web did not become ready");
  checks.push("production_web_start");
  const key = randomUUID();
  const submit = () => fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, "Idempotency-Key": key }, body: JSON.stringify({ question: "公共工程隔离验收：未知产品与未配置模型真实缺口" }) });
  const response = await submit(); assert.equal(response.status, 202);
  const created = AcceptedInvestigationSchema.parse(await response.json());
  const repeated = await submit(); assert.equal(repeated.status, 202);
  assert.equal(AcceptedInvestigationSchema.parse(await repeated.json()).investigationId, created.investigationId);
  const read = async () => InvestigationDetailSchema.parse(await (await fetch(`${base}/api/investigations/${created.investigationId}`)).json());
  assert.equal((await read()).investigation.status, "PENDING");
  checks.push("real_http_enqueue", "idempotent_network_submission");

  worker = launch(["--import", "tsx", "tests/support/worker-process.ts"], { ...process.env, DATABASE_URL: database.connectionString, MODEL_API_KEY: "", WORKER_POLL_MS: "50", WORKER_LEASE_MS: "2000", WORKER_HEARTBEAT_MS: "200", WORKER_TIMEOUT_MS: "3000", WORKER_SHUTDOWN_GRACE_MS: "2000" }, true);
  await waitUntil(async () => (await read()).investigation.status === "FAILED", "Production Worker did not persist missing-model failure");
  for (let count = 0; count < 2; count++) {
    const state = await read(); assert.equal(state.investigation.error?.code, "PROVIDER_NOT_CONFIGURED"); assert.equal(state.identityConfirmation, null); assert.equal(state.investigation.resultSnapshotId, null);
    assert(!JSON.stringify(state).includes("executionToken"));
  }
  assert.equal(await database.db.executionAttempt.count(), 1);
  assert.equal(await database.db.evidenceSnapshot.count(), 0);
  checks.push("real_worker_claim", "missing_model_is_failure", "fresh_api_reads_preserve_failure", "no_empty_success_snapshot");

  // Isolated fixture creates only the required source snapshot; production advice handler
  // remains unconfigured. This checks real task execution/failure, not real generation.
  const fixtureRepository = new InvestigationRepository(database.db);
  const fixtureInvestigation = await fixtureRepository.createInvestigation({ question: "Isolated advice execution acceptance source" });
  const fixtureSnapshot = await fixtureRepository.createSnapshot(makeSnapshot(fixtureInvestigation.id));
  const fixtureAnswer = makeAnswer(fixtureSnapshot);
  await fixtureRepository.createAnswer(fixtureAnswer);
  const fixtureAdviceBase = `${base}/api/investigations/${fixtureInvestigation.id}/advice-requests`;
  const adviceKey = randomUUID();
  const submitAdvice = () => fetch(fixtureAdviceBase, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, "Idempotency-Key": adviceKey }, body: JSON.stringify({ snapshotId: fixtureSnapshot.id, userConditions: { useCase: "Isolated task failure test only", experience: null, budget: null, requirements: [] } }) });
  const acceptedAdviceResponse = await submitAdvice(); assert.equal(acceptedAdviceResponse.status, 202);
  const acceptedAdvice = AcceptedAdviceRequestSchema.parse(await acceptedAdviceResponse.json());
  const repeatedAdviceResponse = await submitAdvice(); assert.equal(repeatedAdviceResponse.status, 202);
  assert.equal(AcceptedAdviceRequestSchema.parse(await repeatedAdviceResponse.json()).adviceRequestId, acceptedAdvice.adviceRequestId);
  const readAdvice = async () => AdviceRequestDetailSchema.parse(await (await fetch(`${fixtureAdviceBase}/${acceptedAdvice.adviceRequestId}`)).json());
  await waitUntil(async () => (await readAdvice()).request.status === "FAILED", "Advice Worker did not persist its missing-provider failure");
  const adviceState = await readAdvice();
  assert.equal(adviceState.request.error?.code, "PROVIDER_NOT_CONFIGURED"); assert.equal(adviceState.advice, null);
  assert(!JSON.stringify(adviceState).includes("executionToken"));
  assert.equal(await database.db.adviceExecutionAttempt.count(), 1);
  assert.equal(await database.db.advice.count(), 0);
  assert.deepEqual(await fixtureRepository.findAnswer(fixtureAnswer.id), fixtureAnswer);
  checks.push("network_advice_idempotent_enqueue", "production_advice_worker_missing_provider", "advice_failure_preserves_objective_answer");

  worker.child.send("shutdown");
  const [code] = await Promise.race([worker.exited, delay(5000).then(() => { throw new Error("Worker did not shut down gracefully"); })]);
  assert.equal(code, 0); assert(worker.output().includes('"event":"worker.stopped"')); assert(worker.output().includes('"event":"advice.worker.stopped"'));
  checks.push("independent_worker_graceful_shutdown");

  const wrongMethod = await fetch(`${base}/api/investigations`);
  assert.equal(wrongMethod.status, 405); ApiErrorResponseSchema.parse(await wrongMethod.json());
  const missingSnapshot = await fetch(`${base}/api/snapshots/${randomUUID()}`);
  assert.equal(missingSnapshot.status, 404); ApiErrorResponseSchema.parse(await missingSnapshot.json());
  checks.push("network_json_405", "network_json_404");

  const adviceBase = `${base}/api/investigations/${created.investigationId}/advice-requests`;
  const adviceMissingSnapshot = await fetch(adviceBase, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, "Idempotency-Key": randomUUID() }, body: JSON.stringify({ snapshotId: randomUUID(), userConditions: { useCase: "Isolated route acceptance only", experience: null, budget: null, requirements: [] } }) });
  assert.equal(adviceMissingSnapshot.status, 404); ApiErrorResponseSchema.parse(await adviceMissingSnapshot.json());
  const adviceMissingRequest = await fetch(`${adviceBase}/${randomUUID()}`);
  assert.equal(adviceMissingRequest.status, 404); ApiErrorResponseSchema.parse(await adviceMissingRequest.json());
  const adviceWrongMethod = await fetch(adviceBase);
  assert.equal(adviceWrongMethod.status, 405); ApiErrorResponseSchema.parse(await adviceWrongMethod.json());
  assert.equal(await database.db.adviceRequest.count(), 1);
  checks.push("network_advice_missing_snapshot_404", "network_advice_missing_request_404", "network_advice_json_405");

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
