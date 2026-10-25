import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractDocument, hashText } from "../../src/server/retrieval/documents";
import { extractHtml } from "../../src/server/retrieval/collection";
import { execFileSync } from "node:child_process";

const corpus = resolve(process.argv[2] ?? "research/reader-v4/2026-10-25T03-52-57-311Z");
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
const frozen = JSON.parse(await readFile(join(corpus, "samples.json"), "utf8"));
const directory = resolve("research/reader-v4", `replay-${new Date().toISOString().replace(/[:.]/g, "-")}`);
await mkdir(directory, { recursive: true });
const samples = [];
for (const sample of frozen.samples) {
  const raw = await readFile(sample.comparisonRawPath, "utf8");
  const started = performance.now();
  const sourceDom = extractDocument(raw, sample.url);
  const sourceMs = Math.round(performance.now() - started);
  const dom = new JSDOM(raw, { url: sample.url });
  const readabilityStarted = performance.now();
  let article;
  try { article = new Readability(dom.window.document).parse(); } finally { dom.window.close(); }
  samples.push({ name: sample.name, url: sample.url, query: sample.query, comparisonRawPath: sample.comparisonRawPath,
    comparisonRawHash: hashText(raw), v3Excerpt: extractHtml(raw, sample.query)?.excerpt ?? null,
    readability: { characters: article?.textContent?.length ?? 0, text: article?.textContent ?? "", elapsedMs: Math.round(performance.now() - readabilityStarted) },
    sourceDom: { characters: sourceDom.text.length, text: sourceDom.text, blocks: sourceDom.blocks.length, tables: sourceDom.tables.length,
      comments: sourceDom.blocks.filter(b => b.kind === "COMMENT").length, links: sourceDom.links.length, warnings: sourceDom.warnings, elapsedMs: sourceMs } });
}
await writeFile(join(directory, "samples.json"), JSON.stringify({ sourceCommit, corpus, sourceCapturedAt: frozen.startedAt, replayedAt: new Date().toISOString(),
  scope: "Offline parser comparison of the same genuinely captured bytes; no fresh requests, models, DB or Worker", samples }, null, 2) + "\n");
console.log(JSON.stringify({ directory, samples: samples.map(s => ({ name: s.name, v3Characters: s.v3Excerpt?.length ?? 0,
  readability: s.readability.characters, sourceDom: s.sourceDom.characters, comments: s.sourceDom.comments })) }));
