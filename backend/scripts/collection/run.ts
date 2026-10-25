import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createCollectionProviders } from "../../src/server/retrieval";
import { requestText } from "../../src/server/retrieval/http";

const question = process.argv[2];
if (!question) throw new Error('Usage: npx tsx scripts/collection/run.ts "question" [--probe]');
const startedAt = new Date().toISOString();
const controller = new AbortController();
process.once("SIGINT", () => controller.abort(new DOMException("User cancelled", "AbortError")));
const provider = createCollectionProviders({ signal: controller.signal, question, timeoutMs: 120000, maxSources: 5 });
const result = await provider.collect(question);
// A separate HN discovery for live overseas-source verification, not presented as question evidence.
const community = await provider.searchCommunity(result.identity.name, result.identity);
const first = community.returnedSources[0];
const communityEvidence = first ? await provider.fetch(first.url, { question: result.identity.name }) : null;
const probe = process.argv.includes("--probe") ? await requestText("https://api.wsa.cloud.tencent.com/SearchPro", AbortSignal.timeout(15000), {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Query: question })
}) : null;
const runId = `A1-live-${startedAt.replace(/[:.]/g, "-")}`;
const directory = resolve("research/collection-runs", runId);
await mkdir(directory, { recursive: true });
const audit = { runId, question, startedAt, finishedAt: new Date().toISOString(), result,
  supplementalDiscovery: { scope: "Product-name HN discovery; not asserted relevant to the question", record: community, evidence: communityEvidence },
  unauthenticatedProbe: probe ? { endpoint: probe.url, httpStatus: probe.status, response: JSON.parse(probe.text),
    bodyHash: createHash("sha256").update(probe.text).digest("hex"), note: "No Authorization header; HTTP 200 with service Error is failure" } : null,
  contribution: result.retrievalRecords.filter(r => r.provider.includes("yuanbao")).map(r => ({ status: r.status, error: r.error,
    sources: r.returnedSources.map(s => ({ url: s.url, adoption: s.adoption, reason: s.adoptionReason, evidenceId: s.evidenceId })) })) };
await writeFile(resolve(directory, "collection.json"), JSON.stringify(audit, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ directory, identity: result.identity.confirmationStatus,
  searches: result.retrievalRecords.map(r => ({ provider: r.provider, status: r.status, sources: r.returnedSources.length, error: r.error })),
  reads: result.evidence.map(e => ({ url: e.sourceUrl, status: e.readStatus, error: e.readError })), communityRead: communityEvidence?.readStatus }));
