import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createCollectionProviders, type SearchEntry } from "../../src/server/retrieval";

const question = process.argv[2];
if (!question?.trim()) throw new Error('Usage: npx tsx scripts/collection/run-v3.ts "question" [yuanbao,tavily,bing,hn]');
const entries = (process.argv[3] ?? "yuanbao,tavily").split(",");
if (entries.some(entry => !["yuanbao", "tavily", "bing", "hn"].includes(entry))) throw new Error("Unknown search entry");
const startedAt = new Date().toISOString();
const controller = new AbortController();
process.once("SIGINT", () => controller.abort(new DOMException("User cancelled", "AbortError")));
const provider = createCollectionProviders({ signal: controller.signal, question, timeoutMs: 120_000, maxSources: 5 });
const batches = [];
let stopped: string | null = null;
try {
  // Explicit CLI choices, not an investigation planner. No models/DB/Worker used.
  for (const entry of entries) {
    const begin = Date.now();
    const result = await provider.execute({ query: question, entry: entry as SearchEntry, maxReads: 2 }, { question });
    batches.push({ entry, elapsedMs: Date.now() - begin, ...result });
  }
} catch (error) {
  stopped = error instanceof Error ? `${error.name}: ${error.message}` : "Collection stopped";
}
const identity = provider.discoverIdentity(question, provider.journal.evidence);
const runId = `A1-v3-live-${startedAt.replace(/[:.]/g, "-")}`;
const directory = resolve("research/collection-runs", runId);
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "collection.json"), JSON.stringify({ runId, question, entries, startedAt,
  finishedAt: new Date().toISOString(), stopped, identity, batches, journal: provider.journal,
  scope: "Real collection only; no handler, model decisions, database, Worker or end-to-end acceptance claimed. Search snippets are not original text." }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ directory, identity, stopped,
  searches: provider.journal.retrievalRecords.map(r => ({ provider: r.provider, query: r.query, status: r.status, error: r.error, sources: r.returnedSources.length })),
  reads: provider.journal.evidence.map(e => ({ url: e.sourceUrl, status: e.readStatus, error: e.readError })) }));
