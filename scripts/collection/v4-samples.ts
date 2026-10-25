import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { createDocumentReader, extractDocument, hashText } from "../../src/server/retrieval/documents";
import { extractHtml } from "../../src/server/retrieval/collection";
import { requestText } from "../../src/server/retrieval/http";
import { execFileSync } from "node:child_process";

const startedAt = new Date().toISOString();
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
const directory = resolve("research/reader-v4", startedAt.replace(/[:.]/g, "-"));
await mkdir(directory, { recursive: true });
const reader = createDocumentReader({ storageDir: join(directory, "documents"), timeoutMs: 300_000 });
const samples = [
  { name: "long-integration-blog", url: "https://blog.cloudflare.com/marimo-cloudflare-notebooks/", query: "marimo reactive notebook Cloudflare deployment limitations" },
  { name: "parameter-table", url: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing", query: "模型版本 上下文长度 输出长度 价格" },
  { name: "license-page", url: "https://github.com/langgenius/dify/blob/main/LICENSE", query: "commercial multi tenant logo license" },
  { name: "multi-comment-forum", url: "https://news.ycombinator.com/item?id=38971966", query: "experience model code problem" },
  { name: "javascript-shell", url: "https://petstore.swagger.io/", query: "pet store inventory API available sold" }
];
const results = [];
for (const sample of samples) {
  const began = performance.now();
  const initial = await reader.read(sample.url, { render: "never", timeoutMs: 30_000 });
  const document = initial.document;
  const fs = await import("node:fs/promises");
  let comparisonRawPath = document.rawSources.find(source => source.mode === "STATIC")?.path ?? document.storage.rawPath;
  let raw = comparisonRawPath ? await fs.readFile(comparisonRawPath, "utf8") : "";
  if (sample.name === "multi-comment-forum") {
    try {
      const response = await requestText(sample.url, AbortSignal.timeout(30_000), { maxBytes: 8_000_000 });
      if (response.status !== 200) throw new Error(`Fixed forum HTML HTTP ${response.status}`);
      raw = response.text; comparisonRawPath = join(directory, "forum-original.html");
      await writeFile(comparisonRawPath, response.rawBytes ?? raw);
    } catch (error) {
      console.error(JSON.stringify({ sample: sample.name, comparisonHtmlFailure: error instanceof Error ? error.message : "HTML comparison fetch failed", note: "Typed API document remains valid; no HTML comparison claimed" }));
      comparisonRawPath = null; raw = "";
    }
  }
  const old = extractHtml(raw, sample.query);
  let readability: { characters: number; text: string; elapsedMs: number; error: string | null } = { characters: 0, text: "", elapsedMs: 0, error: null };
  if (raw) {
    const start = performance.now();
    const dom = new JSDOM(raw, { url: document.finalUrl });
    try { const article = new Readability(dom.window.document).parse(); readability = { characters: article?.textContent?.length ?? 0, text: article?.textContent ?? "", elapsedMs: Math.round(performance.now() - start), error: null }; }
    catch (error) { readability.error = error instanceof Error ? error.message : "Readability failed"; }
    finally { dom.window.close(); }
  }
  const sameHtml = extractDocument(raw, document.finalUrl);
  const fragments = reader.select(document, { query: sample.query, maxFragments: 8 });
  for (const fragment of fragments) reader.validateFragment(document, fragment);
  const reread = document.status === "READ" ? await reader.read(sample.url, { render: "never" }) : null;
  const focused = reader.select(document, { query: sample.name === "parameter-table" ? "模型版本" : "limitations license experience", maxFragments: 5 });
  results.push({ ...sample, documentId: document.id, documentVersion: document.version, status: document.status, readError: document.readError,
    rawPath: document.storage.rawPath, rawHash: document.rawHash, textHash: document.textHash, canonicalCharacters: document.text.length,
    blocks: document.blocks.length, tables: document.tables.length, comments: document.blocks.filter(b => b.kind === "COMMENT").length,
    links: document.links.length, metadata: document.metadata, warnings: document.warnings, completeness: document.completeness,
    comparisonRawPath, comparisonRawHash: hashText(raw), sameHtml: { characters: sameHtml.text.length, text: sameHtml.text, blocks: sameHtml.blocks.length,
      tables: sameHtml.tables.length, comments: sameHtml.blocks.filter(b => b.kind === "COMMENT").length, links: sameHtml.links.length },
    elapsedMs: Math.round(performance.now() - began), v3Excerpt: old?.excerpt ?? null, readability, fragments, focused,
    cacheHitOnReread: reread?.cacheHit ?? false, evidence: fragments.map(f => reader.toEvidence(document, f)) });
}
await writeFile(join(directory, "samples.json"), JSON.stringify({ sourceCommit, startedAt, finishedAt: new Date().toISOString(),
  runtime: process.version, scope: "Fixed raw input comparison; no model, DB or Worker", samples: results, journal: reader.journal }, null, 2) + "\n");
console.log(JSON.stringify({ directory, samples: results.map(s => ({ name: s.name, status: s.status, error: s.readError, characters: s.canonicalCharacters,
  blocks: s.blocks, tables: s.tables, comments: s.comments, links: s.links, cacheHit: s.cacheHitOnReread })) }));
