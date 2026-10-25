/** Isolated browser QA only. Never imported by src/, never writes application database. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile, mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { createQueueTestDatabase } from "./database";
import { makeSnapshot, makeAnswer } from "../fixtures/snapshot";
import { PostgresInvestigationQueue } from "../../src/server/queue";
import { WorkerRunner } from "../../src/worker/runner";
import { investigationHandler } from "../../src/server/investigation/handler";
import { AcceptedInvestigationSchema, InvestigationDetailSchema, SnapshotResponseSchema } from "../../src/contracts";

const database = await createQueueTestDatabase();
const queue = new PostgresInvestigationQueue(database.db, { maxAttempts: 1 });
const submitted = async (question: string) => queue.enqueue({ question, idempotencyKey: randomUUID() });
const snapshotJob = await submitted("隔离浏览器测试：核对引用与文本安全（不是产品调查结论）");
const snapshotLease = (await queue.claim("browser-qa-fixture"))!;
const snapshot = makeSnapshot(snapshotJob.investigation!.id);
snapshot.productIdentity.name = "隔离界面测试夹具";
snapshot.evidence[0]!.metadata.title = "界面验证材料，不是产品证据";
snapshot.evidence[0]!.translation = "仅用于隔离环境中的译文展示测试。";
snapshot.claims[0]!.statement = "仅检验引用显示，未开展产品事实核查。";
snapshot.claims[0]!.verificationReason = "这是界面测试夹具，没有核查结论。";
snapshot.gaps = [{ id: randomUUID(), claimIds: [snapshot.claims[0]!.id], kind: "INSUFFICIENT_EVIDENCE", description: "隔离测试未开展真实检索，不能用于任何产品结论。", searchScope: null }];
const answer = makeAnswer(snapshot);
answer.body = "隔离测试夹具：用于检查引用与原文显示，不是产品调查结论。[1]\n<script>window.__unsafe = true</script>";
await queue.complete(snapshotLease, { snapshot, answer });
const identityJob = await submitted("隔离浏览器测试：产品身份确认输入");
await queue.awaitConfirmation((await queue.claim("browser-qa-fixture"))!, {
  identity: { name: "隔离测试对象", officialWebsite: "https://example.com", version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION", confirmationBasis: [] },
  reason: "仅用于验证身份确认表单。请勿视为真实产品候选。"
});
const retryJob = await submitted("隔离浏览器测试：有限手动重试");
await queue.fail((await queue.claim("browser-qa-fixture"))!, { code: "PROVIDER_FAILED", message: "隔离测试的可重试错误，未调用外部提供方。", retryable: true });

const controller = new AbortController();
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], {
  env: { ...process.env, DATABASE_URL: database.connectionString }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true
});
child.stdout.on("data", (value: Buffer) => process.stdout.write(value));
child.stderr.on("data", (value: Buffer) => process.stderr.write(value));
const stop = () => controller.abort();
process.on("SIGINT", stop); process.on("SIGTERM", stop);
let worker: Promise<void> | undefined;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt++) {
    if (child.exitCode !== null) throw new Error("Browser QA Web process exited before readiness");
    try { ready = (await fetch("http://127.0.0.1:3100")).status === 200; } catch { /* Wait for process readiness. */ }
    if (!ready) await delay(100);
  }
  assert(ready, "Browser QA server did not start");
  const base = "http://127.0.0.1:3100";
  const key = randomUUID();
  const post = () => fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key, Origin: base }, body: JSON.stringify({ question: "隔离 HTTP 验证：实际提交与缺配置错误" }) });
  const accepted = await post(); assert.equal(accepted.status, 202);
  const created = AcceptedInvestigationSchema.parse(await accepted.json());
  const repeated = await post(); assert.equal(repeated.status, 202);
  assert.equal(AcceptedInvestigationSchema.parse(await repeated.json()).investigationId, created.investigationId);
  const queued = InvestigationDetailSchema.parse(await (await fetch(`${base}/api/investigations/${created.investigationId}`)).json());
  assert.equal(queued.investigation.status, "PENDING");
  worker = new WorkerRunner(queue, investigationHandler, "isolated-browser-worker", { pollMs: 50 }).run(controller.signal);
  let failed = false;
  for (let attempt = 0; attempt < 100 && !failed; attempt++) {
    const detail = InvestigationDetailSchema.parse(await (await fetch(`${base}/api/investigations/${created.investigationId}`)).json());
    failed = detail.investigation.status === "FAILED";
    if (failed) assert.equal(detail.investigation.error?.code, "PROVIDER_NOT_CONFIGURED");
    else await delay(50);
  }
  assert(failed, "Worker did not record unavailable provider error");
  const persisted = SnapshotResponseSchema.parse(await (await fetch(`${base}/api/snapshots/${snapshot.id}`)).json());
  assert.equal(persisted.snapshot.id, snapshot.id);
  const links = {
    home: base, failed: `${base}/investigations/${created.investigationId}`,
    snapshot: `${base}/investigations/${snapshot.investigationId}`, identity: `${base}/investigations/${identityJob.investigation!.id}`, retry: `${base}/investigations/${retryJob.investigation!.id}`
  };
  await mkdir(".cache", { recursive: true });
  await writeFile(".cache/browser-fixtures.json", JSON.stringify(links, null, 2));
  console.log(JSON.stringify({ event: "browser_qa.ready", networkAssertions: "passed", ...links }));
  if (!controller.signal.aborted) await new Promise<void>((resolve) => controller.signal.addEventListener("abort", () => resolve(), { once: true }));
} finally {
  controller.abort();
  await worker;
  if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  await database.close();
  process.off("SIGINT", stop); process.off("SIGTERM", stop);
  console.log(JSON.stringify({ event: "browser_qa.cleaned" }));
}
