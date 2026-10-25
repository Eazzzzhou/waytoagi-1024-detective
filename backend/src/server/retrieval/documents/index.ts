import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { load as loadHtml } from "cheerio";
import { requestText, normalizeSourceUrl, publicUrl, type HttpAttempt, type HttpRequestOptions, type HttpTextResponse } from "../http";
import { extractDocument, extractHnDocument, hashText, PARSER_VERSION, type ExtractedDocument } from "./extract";
import { fragmentToEvidence, selectFragments, validateFragment } from "./fragments";
import { SourceDocumentSchema, type SourceDocument, type DocumentReadContext, type DocumentReadResult, type DocumentRenderer, type FragmentSelection, type ReaderAudit } from "./types";
import { createSafeBrowserRenderer } from "./browser";

export * from "./types";
export { extractDocument, extractHnDocument, hashText, normalizeText } from "./extract";
export { selectFragments, validateFragment, fragmentToEvidence } from "./fragments";
export { createSafeBrowserRenderer } from "./browser";

export interface DocumentReaderOptions {
  signal?: AbortSignal; timeoutMs?: number; storageDir?: string; maxBytes?: number; maxBlocks?: number;
  renderer?: DocumentRenderer;
  /** Explicit transport seam for deterministic tests; production defaults to safe HTTP. */
  request?: (url: string, signal: AbortSignal, options: HttpRequestOptions) => Promise<HttpTextResponse>;
}
const cleanError = (error: unknown) => error instanceof Error ? `${error.name}: ${error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500)}` : "Unknown document failure";

export function createDocumentReader(options: DocumentReaderOptions = {}) {
  const timeout = options.timeoutMs ?? 600_000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 900_000) throw new Error("Document reader budget must be 1..900000ms");
  const budget = AbortSignal.timeout(timeout);
  const parent = options.signal ? AbortSignal.any([budget, options.signal]) : budget;
  const storageDir = resolve(options.storageDir ?? ".cache/source-documents-v4");
  const cache = new Map<string, SourceDocument>();
  const inFlight = new Map<string, Promise<DocumentReadResult>>();
  const journal: { actions: ReaderAudit[]; httpAttempts: (HttpAttempt & { documentId: string | null })[] } = { actions: [], httpAttempts: [] };
  const request = options.request ?? requestText;
  const renderer = options.renderer ?? (process.env.COLLECTION_BROWSER_EXECUTABLE ? createSafeBrowserRenderer({ executablePath: process.env.COLLECTION_BROWSER_EXECUTABLE }) : undefined);

  async function persist(document: SourceDocument, raw: Uint8Array | null, staticRaw: Uint8Array | null) {
    const dir = join(storageDir, document.id);
    await mkdir(dir, { recursive: true });
    document.storage = { rawPath: raw ? join(dir, "raw.bin") : null, textPath: join(dir, "source.txt"), manifestPath: join(dir, "manifest.json") };
    if (raw) await writeFile(document.storage.rawPath!, raw, { flag: "wx" });
    if (staticRaw) await writeFile(join(dir, "static.bin"), staticRaw, { flag: "wx" });
    document.rawSources = [
      ...(staticRaw ? [{ mode: "STATIC", hash: hashText(staticRaw), path: join(dir, "static.bin") }] : []),
      ...(raw ? [{ mode: document.parser.mode, hash: hashText(raw), path: document.storage.rawPath }] : [])
    ];
    await writeFile(document.storage.textPath!, document.text, { flag: "wx" });
    await writeFile(document.storage.manifestPath!, JSON.stringify(SourceDocumentSchema.parse(document), null, 2) + "\n", { flag: "wx" });
  }

  async function download(url: string, context: DocumentReadContext): Promise<DocumentReadResult> {
    parent.throwIfAborted(); context.signal?.throwIfAborted();
    const caller = context.signal ? AbortSignal.any([parent, context.signal]) : parent;
    const signal = AbortSignal.any([caller, AbortSignal.timeout(Math.max(1, Math.min(context.timeoutMs ?? 30_000, timeout)))]);
    const started = performance.now();
    const action: ReaderAudit = { action: "READ", url, documentId: null, startedAt: new Date().toISOString(), durationMs: 0,
      cacheHit: false, status: "STARTED", fragmentHashes: [], error: null };
    journal.actions.push(action);
    const attempts: (HttpAttempt & { documentId: string | null })[] = [];
    const document: SourceDocument = { schemaVersion: "source-document/v1", id: hashText(randomUUID()), version: hashText("unread"),
      requestedUrl: url, finalUrl: url, retrievedAt: new Date().toISOString(), contentType: "", status: "FAILED", readError: null,
      rawHash: null, textHash: null, text: "", rawSources: [], storage: { rawPath: null, textPath: null, manifestPath: null },
      parser: { name: "readability+source-dom", version: PARSER_VERSION, normalization: "source-text/v1", mode: "STATIC" },
      metadata: { title: null, author: null, publishedAt: null, language: null }, completeness: "COMPLETE", warnings: [], blocks: [], links: [], tables: [] };
    let raw: Uint8Array | null = null;
    let staticRaw: Uint8Array | null = null;
    try {
      const u = publicUrl(url);
      const hn = u.hostname === "news.ycombinator.com" && u.pathname === "/item" && /^\d+$/.test(u.searchParams.get("id") ?? "");
      const fetchUrl = hn ? `https://hn.algolia.com/api/v1/items/${u.searchParams.get("id")}` : url;
      const track = (attempt: HttpAttempt) => { const entry = Object.assign(attempt, { documentId: null as string | null }); journal.httpAttempts.push(entry); attempts.push(entry); };
      let response = await request(fetchUrl, signal, { maxBytes: options.maxBytes ?? 8_000_000,
        onAttempt: track });
      if (u.hostname === "github.com" && /^\/[^/]+\/[^/]+\/blob\//.test(u.pathname) && response.status === 200) {
        const $ = loadHtml(response.text);
        const parts = u.pathname.split("/");
        const rawLink = $("a[href]").toArray().map(el => $(el).attr("href")!).find(href => {
          try {
            const link = publicUrl(new URL(href, response.url).href);
            return (link.hostname === "github.com" && link.pathname.startsWith(`/${parts[1]}/${parts[2]}/raw/`)) ||
              (link.hostname === "raw.githubusercontent.com" && link.pathname.startsWith(`/${parts[1]}/${parts[2]}/`));
          } catch { return false; }
        });
        if (rawLink) {
          staticRaw = response.rawBytes ?? Buffer.from(response.text, "utf8");
          document.metadata.title = $("title").text().trim() || null;
          document.warnings.push("GitHub blob page followed its actual raw-file link; branch/path retained in requestedUrl, raw content version fixed by hash");
          response = await request(publicUrl(new URL(rawLink, response.url).href).href, signal, { maxBytes: options.maxBytes ?? 8_000_000, onAttempt: track });
        } else throw new Error("GitHub blob page contained no usable raw-file link; UI shell is not source text");
      }
      document.contentType = response.contentType; document.finalUrl = hn ? url : publicUrl(response.url).href;
      raw = response.rawBytes ?? Buffer.from(response.text, "utf8");
      document.rawHash = hashText(raw);
      document.retrievedAt = new Date().toISOString();
      if (response.status !== 200) {
        document.status = [401, 403, 429, 451].includes(response.status) ? "RESTRICTED" : "FAILED";
        throw new Error(`Source HTTP ${response.status}`);
      }
      let extracted: ExtractedDocument;
      if (hn) {
        extracted = extractHnDocument(response.text, url, options.maxBlocks);
        document.parser.mode = "HN_JSON";
      } else if (/text\/html|application\/xhtml\+xml/.test(response.contentType)) {
        const charset = response.contentType.match(/charset=([^;\s]+)/i)?.[1];
        if (charset && !/^['"]?utf-8['"]?$/i.test(charset)) throw new Error("Unsupported source encoding; UTF-8 required");
        if (/captcha|verify you are human|just a moment|access denied/i.test(response.text.slice(0, 12000))) {
          document.status = "RESTRICTED"; throw new Error("Source returned access challenge; no bypass attempted");
        }
        extracted = extractDocument(response.text, document.finalUrl, options.maxBlocks);
        const shell = extracted.text.length < 200 && /<script\b|id=["'](?:root|app|__next)["']/i.test(response.text);
        if (context.render === "always" || (context.render !== "never" && shell)) {
          if (renderer) {
            // Keep static and rendered acquisitions as distinct immutable versions.
            staticRaw = raw;
            const rendered = await renderer(document.finalUrl, signal, attempt => { const entry = Object.assign(attempt, { documentId: null as string | null }); journal.httpAttempts.push(entry); attempts.push(entry); });
            publicUrl(rendered.finalUrl);
            document.finalUrl = rendered.finalUrl; raw = Buffer.from(rendered.html, "utf8"); document.rawHash = hashText(raw);
            document.parser.mode = "RENDERED"; document.parser.version += `+${rendered.engine}-${rendered.version}`;
            extracted = extractDocument(rendered.html, document.finalUrl, options.maxBlocks);
          } else document.warnings.push("JavaScript rendering unavailable; static DOM only");
        }
        if (!extracted.text.trim() || (shell && !renderer && extracted.text.length < 80)) throw new Error("No readable original material; JavaScript shell is not original evidence");
      } else if (/text\/(plain|markdown)/.test(response.contentType)) {
        const text = response.text.replace(/\r\n?/g, "\n").trim();
        extracted = { text, blocks: text ? [{ id: "b0", kind: "TEXT", start: 0, end: text.length, locator: "UTF-8 source text", headingPath: [],
          mainContent: true, author: null, publishedAt: null, parentId: null, sourceUrl: null }] : [], links: [], tables: [], metadata: document.metadata, warnings: [], completeness: "COMPLETE" };
        document.parser.mode = "PLAIN_TEXT";
      } else throw new Error(`Unsupported source media: ${response.contentType || "unknown"}; PDF/video not claimed supported`);
      if (!extracted.text.trim()) throw new Error("No readable original text");
      const previousWarnings = document.warnings;
      Object.assign(document, extracted);
      document.warnings = [...previousWarnings, ...extracted.warnings];
      document.textHash = hashText(document.text);
      document.version = hashText(`${document.rawHash}\n${document.textHash}\n${document.parser.version}\n${document.parser.mode}`);
      document.status = "READ";
      signal.throwIfAborted();
    } catch (error) {
      if (document.status !== "RESTRICTED") document.status = "FAILED";
      document.readError = cleanError(signal.aborted ? signal.reason : error);
      document.text = ""; document.blocks = []; document.tables = []; document.links = []; document.textHash = null;
      document.version = hashText(`${document.rawHash ?? "unread"}\n${document.readError}`);
    }
    try {
      await persist(document, raw, staticRaw);
      action.documentId = document.id; attempts.forEach(attempt => { attempt.documentId = document.id; });
      action.status = document.status; action.error = document.readError;
    } finally { action.durationMs = Math.round(performance.now() - started); }
    // Save actual failed state before propagating investigation cancellation.
    caller.throwIfAborted();
    return { document: SourceDocumentSchema.parse(document), cacheHit: false };
  }

  async function read(url: string, context: DocumentReadContext = {}): Promise<DocumentReadResult> {
    parent.throwIfAborted(); context.signal?.throwIfAborted();
    const normalized = normalizeSourceUrl(url);
    const key = `${normalized}\n${context.render === "always" ? "rendered" : "auto"}`;
    const previous = cache.get(key);
    if (previous && !context.refresh) {
      journal.actions.push({ action: "READ", url: normalized, documentId: previous.id, startedAt: new Date().toISOString(), durationMs: 0,
        cacheHit: true, status: previous.status, fragmentHashes: [], error: null });
      return { document: previous, cacheHit: true };
    }
    if (!context.refresh && inFlight.has(key)) {
      const result = await inFlight.get(key)!;
      context.signal?.throwIfAborted();
      journal.actions.push({ action: "READ", url: normalized, documentId: result.document.id, startedAt: new Date().toISOString(), durationMs: 0,
        cacheHit: true, status: result.document.status, fragmentHashes: [], error: result.document.readError });
      return { document: result.document, cacheHit: true };
    }
    const pending = download(normalized, context);
    if (!context.refresh) inFlight.set(key, pending);
    try {
      const result = await pending;
      if (result.document.status === "READ") cache.set(key, result.document);
      return result;
    } finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
  }

  function select(document: SourceDocument, input: FragmentSelection) {
    parent.throwIfAborted();
    const started = performance.now();
    const result = selectFragments(document, input);
    journal.actions.push({ action: "SELECT", url: document.finalUrl, documentId: document.id, startedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started), cacheHit: true, status: "SUCCEEDED", fragmentHashes: result.map(f => f.fragmentHash), error: null });
    return result;
  }

  async function load(documentId: string): Promise<SourceDocument> {
    if (!/^[a-f0-9]{64}$/.test(documentId)) throw new Error("Invalid document ID");
    const started = performance.now();
    const dir = join(storageDir, documentId);
    const document = SourceDocumentSchema.parse(JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")));
    const text = await readFile(join(dir, "source.txt"), "utf8");
    if (document.id !== documentId || text !== document.text || (document.textHash && hashText(text) !== document.textHash) ||
      document.blocks.some(b => b.start < 0 || b.end > text.length || b.end <= b.start)) throw new Error("Stored document text/version integrity check failed");
    if (document.rawHash && hashText(await readFile(join(dir, "raw.bin"))) !== document.rawHash) throw new Error("Stored raw document integrity check failed");
    for (const source of document.rawSources) {
      const filename = source.hash === document.rawHash ? "raw.bin" : "static.bin";
      if (hashText(await readFile(join(dir, filename))) !== source.hash) throw new Error("Stored acquisition chain integrity check failed");
    }
    journal.actions.push({ action: "LOAD", url: document.finalUrl, documentId, startedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - started),
      cacheHit: true, status: document.status, fragmentHashes: [], error: null });
    return document;
  }
  return { read, select, load, toEvidence: fragmentToEvidence, validateFragment, journal, storageDir };
}
