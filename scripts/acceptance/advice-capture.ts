import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { AdviceRequestDetailSchema, IdSchema, SnapshotResponseSchema, type AdviceRequestDetail } from "../../src/contracts";

export async function captureAdvice(options: {
  baseUrl: string; investigationId: string; requestId: string; timeoutMs?: number;
}, dependencies: { fetch?: typeof fetch; pause?: (ms: number) => Promise<void>; now?: () => number } = {}) {
  const investigationId = IdSchema.parse(options.investigationId), requestId = IdSchema.parse(options.requestId);
  const base = new URL(options.baseUrl);
  if (!/^https?:$/.test(base.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("Use a local HTTP(S) origin without credentials, path or query");
  const timeoutMs = options.timeoutMs ?? 720000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000) throw new Error("Invalid capture timeout");
  const now = dependencies.now ?? Date.now;
  const started = now(), deadline = started + timeoutMs;
  const request = dependencies.fetch ?? fetch;
  const pause = dependencies.pause ?? (ms => delay(ms));
  const read = async (path: string, readDeadline = deadline) => {
    const response = await request(new URL(path, base), { method: "GET", signal: AbortSignal.timeout(Math.max(1, Math.min(15000, readDeadline - now()))), cache: "no-store", redirect: "error" });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Capture read HTTP ${response.status}`); }
    return response.json() as Promise<unknown>;
  };
  const observedStates: { status: string; observedAt: string }[] = [];
  let detail: AdviceRequestDetail;
  do {
    detail = AdviceRequestDetailSchema.parse(await read(`/api/investigations/${investigationId}/advice-requests/${requestId}`));
    if (detail.request.id !== requestId || detail.request.investigationId !== investigationId) throw new Error("Advice request does not match the requested scope");
    if (observedStates.at(-1)?.status !== detail.request.status) observedStates.push({ status: detail.request.status, observedAt: new Date(now()).toISOString() });
    if (!["PENDING", "RUNNING"].includes(detail.request.status) || now() >= deadline) break;
    await pause(Math.min(1000, Math.max(1, deadline - now())));
  } while (["PENDING", "RUNNING"].includes(detail.request.status));
  const terminal = !["PENDING", "RUNNING"].includes(detail.request.status);
  // The polling deadline must not prevent saving the source of a timed-out observation.
  const source = SnapshotResponseSchema.parse(await read(`/api/snapshots/${detail.request.snapshotId}`, now() + 15000));
  if (source.snapshot.id !== detail.request.snapshotId || source.snapshot.investigationId !== investigationId) throw new Error("Advice source snapshot does not match investigation");
  const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return {
    schemaVersion: "advice-capture/1", capturedAt: new Date(now()).toISOString(), readOnly: true,
    outcome: terminal ? detail.request.status : "OBSERVATION_TIMEOUT", observedStates, detail,
    source, snapshotSha256: digest(source.snapshot), objectiveAnswersSha256: digest(source.answers),
    note: "Only persisted API data was read. A captured success is not a human semantic review; objective answers are preserved as a read-only observation."
  };
}

export async function writeAdviceCapture(path: string, record: Awaited<ReturnType<typeof captureAdvice>>) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function main() {
  const [investigationId, requestId, output, baseUrl = "http://127.0.0.1:3000"] = process.argv.slice(2);
  if (!investigationId || !requestId || !output) throw new Error("Usage: npm run advice:capture -- <investigationId> <requestId> <new-output.json> [local-origin]");
  const record = await captureAdvice({ investigationId, requestId, baseUrl });
  await writeAdviceCapture(output, record);
  console.log(JSON.stringify({ outcome: record.outcome, investigationId, requestId, snapshotId: record.detail.request.snapshotId, output }));
  process.exitCode = ["SUCCEEDED", "INSUFFICIENT_CONDITIONS"].includes(record.outcome) ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error("Advice capture failed: check arguments, local API, persisted contracts and a new output filename; no result was fabricated."); process.exitCode = 1; });
