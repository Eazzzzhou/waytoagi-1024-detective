import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createDocumentReader, createSafeBrowserRenderer } from "../../src/server/retrieval/documents";
import { execFileSync } from "node:child_process";

const startedAt = new Date().toISOString();
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
const directory = resolve("research/reader-v4", `render-${startedAt.replace(/[:.]/g, "-")}`);
await mkdir(directory, { recursive: true });
const url = process.argv[2] ?? "https://petstore.swagger.io/";
const executablePath = process.env.COLLECTION_BROWSER_EXECUTABLE ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const reader = createDocumentReader({ storageDir: join(directory, "documents"), timeoutMs: 90_000,
  renderer: createSafeBrowserRenderer({ executablePath }) });
let documentId: string | null = null;
let error: string | null = null;
let result;
try {
  result = await reader.read(url, { render: "auto", timeoutMs: 75_000 });
  documentId = result.document.id;
} catch (cause) { error = cause instanceof Error ? cause.message : "Renderer failed"; }
const fragments = result ? reader.select(result.document, { query: "pet store inventory available sold", maxFragments: 8 }) : [];
await writeFile(join(directory, "render.json"), JSON.stringify({ sourceCommit, startedAt, finishedAt: new Date().toISOString(), url,
  documentId, document: result?.document, error, fragments, journal: reader.journal,
  scope: "Real isolated browser rendering; all HTTP routed through pinned-public-IP transport; no login/captcha bypass; no DB/Worker" }, null, 2) + "\n");
console.log(JSON.stringify({ directory, status: result?.document.status, error: result?.document.readError ?? error,
  mode: result?.document.parser.mode, characters: result?.document.text.length, fragments: fragments.length, httpAttempts: reader.journal.httpAttempts.length }));
