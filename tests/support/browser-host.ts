/** Isolated browser QA only. Never imported by src/, never writes application database. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { createQueueTestDatabase } from "./database";
import { makeReadingCase } from "../fixtures/result-reading";
import { PostgresInvestigationQueue } from "../../src/server/queue";
import { WorkerRunner } from "../../src/worker/runner";
import { investigationHandler } from "../../src/server/investigation/handler";
import { AcceptedInvestigationSchema, InvestigationDetailSchema, SnapshotResponseSchema } from "../../src/contracts";

const database = await createQueueTestDatabase();
const queue = new PostgresInvestigationQueue(database.db, { maxAttempts: 1 });
const submitted = async (question: string) => queue.enqueue({ question, idempotencyKey: randomUUID() });
const snapshotJob = await submitted("隔离浏览器测试：核对引用与文本安全（不是产品调查结论）");
const snapshotLease = (await queue.claim("browser-qa-fixture"))!;
const { snapshot, answers } = makeReadingCase(snapshotJob.investigation!.id);
snapshot.claims.push({ ...structuredClone(snapshot.claims[0]!), id: randomUUID(), statement: "隔离视觉验收：保存状态为存在争议（不是产品结论）", verificationStatus: "DISPUTED", verificationReason: "仅用于核对共享契约 DISPUTED 的前端视觉反馈。" });
await queue.complete(snapshotLease, { snapshot, answer: answers[0]! });
const identityJob = await submitted("隔离浏览器测试：产品身份确认输入");
await queue.awaitConfirmation((await queue.claim("browser-qa-fixture"))!, {
  identity: { name: "隔离测试对象", officialWebsite: "https://example.com", version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION", confirmationBasis: [] },
  reason: "仅用于验证身份确认表单。请勿视为真实产品候选。"
});
const retryJob = await submitted("隔离浏览器测试：有限手动重试");
await queue.fail((await queue.claim("browser-qa-fixture"))!, { code: "PROVIDER_FAILED", message: "隔离测试的可重试错误，未调用外部提供方。", retryable: true });

const controller = new AbortController();
const workerController = new AbortController();
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], {
  env: { ...process.env, DATABASE_URL: database.connectionString }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true
});
child.stdout.on("data", (value: Buffer) => process.stdout.write(value));
child.stderr.on("data", (value: Buffer) => process.stderr.write(value));
const stop = () => { controller.abort(); workerController.abort(); };
// Optional file signal permits graceful Windows cleanup without terminating the PTY tree.
const stopFile = process.env.BROWSER_QA_STOP_FILE;
const stopTimer = stopFile ? setInterval(() => { void stat(stopFile).then(stop).catch(() => {}); }, 500) : null;
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
  worker = new WorkerRunner(queue, investigationHandler, "isolated-browser-worker", { pollMs: 50 }).run(workerController.signal);
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
  // Keep visual QA states stable through actual queue transitions, never a fake UI timer.
  workerController.abort(); await worker;
  const stressJob = await submitted("隔离视觉测试：长回答与大量来源（不是产品调查结论）");
  const stressLease = (await queue.claim("browser-qa-stress"))!;
  const stress = makeReadingCase(stressJob.investigation!.id);
  while (stress.snapshot.evidence.length < 30) stress.snapshot.evidence.push({ ...structuredClone(stress.snapshot.evidence[2]!), id: randomUUID() });
  stress.answers[0]!.body += "\n" + "隔离长回答：每条主张仍需依据核对，以下文字不构成产品事实。\n".repeat(60);
  await queue.complete(stressLease, { snapshot: stress.snapshot, answer: stress.answers[0]! });
  const pendingJob = await submitted("隔离视觉测试：等待后台领取任务");
  const links = {
    home: base, failed: `${base}/investigations/${created.investigationId}`,
    snapshot: `${base}/investigations/${snapshot.investigationId}`, identity: `${base}/investigations/${identityJob.investigation!.id}`, retry: `${base}/investigations/${retryJob.investigation!.id}`,
    pending: `${base}/investigations/${pendingJob.investigation!.id}`, stress: `${base}/investigations/${stress.snapshot.investigationId}`
  };
  await mkdir(".cache", { recursive: true });
  await writeFile(".cache/browser-fixtures.json", JSON.stringify(links, null, 2));
  console.log(JSON.stringify({ event: "browser_qa.ready", networkAssertions: "passed", ...links }));
  if (!controller.signal.aborted) await new Promise<void>((resolve) => controller.signal.addEventListener("abort", () => resolve(), { once: true }));
} finally {
  if (stopTimer) clearInterval(stopTimer);
  controller.abort();
  workerController.abort();
  await worker;
  if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  await database.close();
  process.off("SIGINT", stop); process.off("SIGTERM", stop);
  console.log(JSON.stringify({ event: "browser_qa.cleaned" }));
}
