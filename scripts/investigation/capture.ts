import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { InvestigationDetailSchema, SnapshotResponseSchema, assertAnswerReferences } from "../../src/contracts";

// Reads only the public API. Never supplies case references, expected answers or source lists.
const investigationId = process.argv[2];
if (!investigationId) throw new Error("Usage: npx tsx scripts/investigation/capture.ts <investigationId> [outputDirectory] [baseUrl]");
const directory = resolve(process.argv[3] ?? `research/runtime-runs/${investigationId}`);
const base = process.argv[4] ?? "http://127.0.0.1:3000";
const states: { status: string; stage: string; observedAt: string }[] = [];
let detail;
for (let attempt = 0; attempt < 600; attempt++) {
  const response = await fetch(`${base}/api/investigations/${investigationId}`);
  if (!response.ok) throw new Error(`Investigation API HTTP ${response.status}`);
  detail = InvestigationDetailSchema.parse(await response.json());
  const current = { status: detail.investigation.status, stage: detail.investigation.stage, observedAt: new Date().toISOString() };
  if (states.at(-1)?.status !== current.status || states.at(-1)?.stage !== current.stage) states.push(current);
  if (!["RUNNING", "PENDING"].includes(current.status)) break;
  await delay(1000);
}
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "investigation.json"), JSON.stringify({ capturedAt: new Date().toISOString(), url: `${base}/investigations/${investigationId}`, detail, observedStates: states }, null, 2));
if (!detail?.investigation.resultSnapshotId) {
  console.log(JSON.stringify({ investigationId, status: detail?.investigation.status, error: detail?.investigation.error, snapshotId: null, directory }));
  process.exitCode = 1;
} else {
  const id = detail.investigation.resultSnapshotId;
  const response = await fetch(`${base}/api/snapshots/${id}`);
  if (!response.ok) throw new Error(`Snapshot API HTTP ${response.status}`);
  const data = SnapshotResponseSchema.parse(await response.json());
  data.answers.forEach(answer => assertAnswerReferences(answer, data.snapshot));
  for (const evidence of data.snapshot.evidence.filter(item => item.readStatus === "READ")) {
    if (createHash("sha256").update(evidence.originalExcerpt!).digest("hex") !== evidence.contentHash) throw new Error(`Saved original excerpt hash mismatch: ${evidence.id}`);
  }
  await writeFile(resolve(directory, "snapshot-response.json"), JSON.stringify(data, null, 2));
  const result = {
    investigationId, snapshotId: id, status: detail.investigation.status,
    url: `${base}/investigations/${investigationId}`,
    citations: data.answers.reduce((sum, answer) => sum + answer.citations.length, 0),
    exactQuoteChecks: "PASSED", excerptHashChecks: "PASSED", semanticChecks: data.snapshot.verificationAudit?.citationChecks ?? [],
    review: data.snapshot.verificationAudit?.review ?? null,
    retrieval: data.snapshot.retrievalRecords.map(record => ({ provider: record.provider, status: record.status, returnedSources: record.returnedSources.length, adopted: record.returnedSources.filter(source => source.adoption === "ADOPTED").length })),
    modelCalls: data.snapshot.verificationAudit?.modelCalls ?? [], directory
  };
  await writeFile(resolve(directory, "validation.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ investigationId, snapshotId: id, status: detail.investigation.status, citations: result.citations, directory }));
}
