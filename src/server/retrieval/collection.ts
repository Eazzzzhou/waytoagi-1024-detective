import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { z } from "zod";
import { EvidenceSchema, ProductIdentitySchema, RetrievalRecordSchema, RetrievedSourceSchema,
  type Evidence, type ProductIdentity, type RetrievalRecord } from "../../contracts";
import { normalizeSourceUrl, publicUrl, requestText, type HttpAttempt, type HttpRequestOptions } from "./http";

export interface CollectionContext { signal?: AbortSignal; timeoutMs?: number; question?: string; officialWebsite?: string | null }
export interface CollectionOptions extends CollectionContext { maxSources?: number; yuanbaoImportPath?: string }
export type SearchEntry = "yuanbao" | "bing" | "hn" | "tavily";
export interface CollectionRequest {
  query: string;
  entry: SearchEntry;
  /** Omit to read the returned URLs; [] performs search only. */
  readUrls?: string[];
  maxReads?: number;
}
export interface CollectionDiagnostic { retrievalRecordId: string | null; stage: "SEARCH_RESULT" | "READ"; index: number; error: string }
export interface CollectionResult { retrievalRecords: RetrievalRecord[]; evidence: Evidence[]; diagnostics: CollectionDiagnostic[] }
const now = () => new Date().toISOString();
const clean = (s: string | null | undefined) => s?.replace(/\s+/g, " ").trim() || null;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const WSA = "https://api.wsa.cloud.tencent.com/SearchPro";
function isOfficialUrl(source: string, official: string) {
  const u = new URL(source); const o = new URL(official);
  const root = o.hostname.replace(/^www\./, "");
  if (!(u.hostname === root || u.hostname.endsWith(`.${root}`))) return false;
  // Shared-host product pages do not make every repository/page on that host official.
  return o.pathname === "/" || u.pathname === o.pathname || u.pathname.startsWith(`${o.pathname.replace(/\/$/, "")}/`);
}
export function unresolvedIdentity(question: string): ProductIdentity {
  return ProductIdentitySchema.parse({ name: question.trim().slice(0, 120), officialWebsite: null,
    version: null, plan: null, confirmationStatus: "UNRESOLVED", confirmationBasis: [] });
}

/** A conservative discovery hint, never proof of legal ownership or a version. */
function identityName(question: string, evidence: Evidence): string | null {
  if (evidence.readStatus !== "READ" || !evidence.originalExcerpt) return null;
  if (/\bcompare\b|\bversus\b|\bvs\b|比较|对比/i.test(question)) return null;
  const finalUrl = evidence.originalLocation?.locator.split(" :: ")[0];
  if (!finalUrl) return null;
  const hostLabels = new URL(finalUrl).hostname.toLowerCase().split(".");
  const tokens = question.match(/[a-z][a-z0-9-]{2,}/gi) ?? [];
  const ignored = new Set(["www", "com", "org", "net", "api", "docs", "app", "cloud", "what", "how", "the"]);
  const names = [...new Set(tokens.filter(t => !ignored.has(t.toLowerCase()) && hostLabels.at(-2) === t.toLowerCase() &&
    evidence.metadata.title?.toLowerCase().includes(t.toLowerCase())))];
  return names.length === 1 ? names[0]! : null;
}

// Manual import is explicitly semi-automatic. It cannot be silently reused for a new question.
export const YuanbaoImportSchema = z.strictObject({
  mode: z.literal("MANUAL_YUANBAO"), query: z.string().trim().min(1), calledAt: z.iso.datetime({ offset: true }),
  capturedAt: z.iso.datetime({ offset: true }), entryUrl: z.url().refine(v => new URL(v).hostname === "yuanbao.tencent.com"),
  captureMethod: z.string().trim().min(1), responseText: z.string().trim().min(1),
  returnedSources: z.array(RetrievedSourceSchema).max(20)
});

function emptyEvidence(url: string): Evidence {
  return { id: randomUUID(), sourceUrl: publicUrl(url).href, originalExcerpt: null, translation: null, originalLocation: null,
    metadata: { title: null, siteName: new URL(url).hostname, author: null, publishedAt: null, language: null,
      sourceType: "UNKNOWN", contentKind: "UNKNOWN", productVersion: null, plan: null, upstreamUrl: null,
      independence: "UNKNOWN", originGroupId: null, independenceReason: null },
    retrievedAt: now(), readStatus: "NOT_FETCHED", readError: null, contentHash: null };
}

/** Extract an exact (untranslated) substring of whitespace-normalized DOM text. */
export function extractHtml(html: string, question = "") {
  const $ = load(html);
  const title = clean($("title").first().text());
  const author = clean($("meta[name='author']").attr("content"));
  const language = clean($("html").attr("lang"));
  const published = $("meta[property='article:published_time']").attr("content");
  const publishedAt = published && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(published) && Number.isFinite(Date.parse(published)) ? new Date(published).toISOString() : null;
  $("script,style,noscript,nav,header,footer,form,svg,template,aside,[hidden],[aria-hidden='true']").remove();
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const rootSelector = root.is("article") ? "article:first" : root.is("main") ? "main:first" : "body";
  const tables = root.find("table").toArray();
  const chinese = question.match(/[\u4e00-\u9fff]+/g) ?? [];
  const grams = chinese.flatMap(span => [2, 3, 4].flatMap(size => Array.from({ length: Math.max(0, span.length - size + 1) }, (_, i) => span.slice(i, i + size))));
  const terms = [...new Set([...(question.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? []), ...grams])];
  const selector = "p,li,pre,tr,h1,h2,h3";
  const blocks = root.find(selector).toArray().map((el, index) => ({ el, index }))
    .filter(({ el }) => $(el).is("tr") || (!$(el).closest("tr").length && !$(el).find(selector).length)).map(({ el, index }) => ({
      text: clean($(el).text()) ?? "", minimum: $(el).is("tr") ? 3 : 30,
      tableContext: $(el).is("tr") ? clean($(el).closest("table").text()) : null,
      locator: $(el).is("tr") ? `${rootSelector} :: tables[${tables.findIndex(table => table === $(el).closest("table").get(0))}]` : `${rootSelector} :: blocks(${selector})[${index}]`
    })).filter(b => b.text.length >= b.minimum);
  const ranked = blocks.map(b => ({ ...b, score: terms.reduce((s, t) => s + (b.text.toLowerCase().includes(t) ? t.length : 0), 0) })).sort((a, b) => b.score - a.score);
  const chosen = ranked[0];
  if (!chosen) return null;
  // Center a <=300-character contiguous excerpt on the first matched query term.
  const match = terms.map(t => chosen.text.toLowerCase().indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const original = chosen.tableContext ?? chosen.text;
  const target = chosen.tableContext ? Math.max(0, original.indexOf(chosen.text)) + match : match;
  // Keep the actual table header/field subject when it fits; never concatenate rows.
  const start = original.length <= 300 || target + chosen.text.length <= 300 ? 0 : Math.max(0, target - 80);
  const excerpt = original.slice(start, start + 300).trim();
  const offset = original.indexOf(excerpt, start);
  return { title, author, language, publishedAt, excerpt, locator: `${chosen.locator}; normalized UTF-16 [${offset},${offset + excerpt.length})`,
    context: chosen.tableContext?.slice(0, 4000) ?? chosen.text.slice(Math.max(0, offset - 100), offset + excerpt.length + 100) };
}

export function createCollectionProviders(options: CollectionOptions = {}) {
  const totalMs = options.timeoutMs ?? 60_000;
  if (!Number.isInteger(totalMs) || totalMs < 1 || totalMs > 300_000) throw new Error("Collection budget must be 1..300000ms");
  const budget = AbortSignal.timeout(totalMs);
  const overall = options.signal ? AbortSignal.any([options.signal, budget]) : budget;
  const maxSources = Math.min(12, Math.max(1, options.maxSources ?? 6));
  const diagnostics: CollectionDiagnostic[] = [];
  const retrievalRecords: RetrievalRecord[] = [];
  const evidenceRecords: Evidence[] = [];
  const httpAttempts: (HttpAttempt & { ownerId: string | null })[] = [];
  const request = (url: string, signal: AbortSignal, init: HttpRequestOptions = {}, ownerId: string | null = null) =>
    requestText(url, signal, { ...init, onAttempt: attempt => httpAttempts.push(Object.assign(attempt, { ownerId })) });
  function operation(context: CollectionContext = {}) {
    const parent = context.signal ? AbortSignal.any([overall, context.signal]) : overall;
    const signal = AbortSignal.any([parent, AbortSignal.timeout(Math.min(context.timeoutMs ?? 15_000, 30_000))]);
    parent.throwIfAborted();
    return { parent, signal };
  }
  function failure(error: unknown) {
    // Redact before journaling; propagate parent cancellation after saving records.
    if (error instanceof Error && error.name === "TimeoutError") return "Request time budget exhausted";
    return error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500) : "Unknown collection failure";
  }
  function record(provider: string, query: string): RetrievalRecord {
    if (!query.trim()) throw new Error("Search query must not be empty");
    return { id: randomUUID(), provider, query, calledAt: now(), status: "SUCCEEDED", error: null, returnedSources: [] };
  }

  function finish(out: RetrievalRecord): RetrievalRecord {
    if (!out.returnedSources.length && diagnostics.some(d => d.retrievalRecordId === out.id)) {
      out.status = "FAILED"; out.error = "Search returned no usable URLs; malformed/unsafe result diagnostics retained";
    }
    const parsed = RetrievalRecordSchema.parse(out);
    retrievalRecords.push(parsed);
    return parsed;
  }

  function addSource(out: RetrievalRecord, index: number, read: () => { url: string; title?: string | null; snippet?: string | null }) {
    try {
      const source = read();
      out.returnedSources.push(RetrievedSourceSchema.parse({ url: normalizeSourceUrl(source.url), title: clean(source.title),
        snippet: clean(source.snippet), adoption: "PENDING", adoptionReason: null, evidenceId: null }));
    } catch {
      // Do not echo untrusted raw result fields (which may include credentials).
      diagnostics.push({ retrievalRecordId: out.id, stage: "SEARCH_RESULT", index, error: "Malformed or unsafe search result rejected" });
    }
  }

  async function search(query: string, _identity?: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context);
    const out = record("tencent-yuanbao-search-api", query);
    try {
      const path = options.yuanbaoImportPath ?? process.env.YUANBAO_IMPORT_PATH;
      if (path) {
        const imported = YuanbaoImportSchema.parse(JSON.parse(await readFile(path, { encoding: "utf8", signal })));
        if (imported.query !== query) throw new Error("Manual Yuanbao query does not exactly match current query");
        if (Date.parse(imported.calledAt) > Date.now() || Date.parse(imported.capturedAt) > Date.now() || Date.parse(imported.capturedAt) < Date.parse(imported.calledAt)) throw new Error("Invalid import chronology");
        out.provider = "yuanbao-web-manual-import:semi-automatic";
        out.calledAt = imported.calledAt;
        out.returnedSources = imported.returnedSources.map(s => ({ ...s, adoption: "PENDING", adoptionReason: null, evidenceId: null }));
      } else {
        let key = process.env.TENCENTCLOUD_WSA_APIKEY?.trim();
        if (!key && process.env.TENCENTCLOUD_WSA_APIKEY_FILE) {
          const file = await readFile(process.env.TENCENTCLOUD_WSA_APIKEY_FILE, { encoding: "utf8", signal });
          const keys = [...new Set(file.match(/\bsk-[A-Za-z0-9_-]+\b/g) ?? [])];
          if (keys.length !== 1) throw new Error("Key file must contain exactly one distinct sk- service key");
          key = keys[0];
        }
        if (!key) throw new Error("Missing TENCENTCLOUD_WSA_APIKEY or question-matched YUANBAO_IMPORT_PATH; no authenticated request sent");
        // Service tiers constrain Cnt (e.g. 5 is rejected); use the documented minimal request and cap locally.
        const response = await request(WSA, signal, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ Query: query }) }, out.id);
        if (response.status !== 200) throw new Error(`Yuanbao search HTTP ${response.status}`);
        const envelope = JSON.parse(response.text).Response;
        if (envelope?.Error) throw new Error(`Yuanbao service ${String(envelope.Error.Code ?? "UNKNOWN")}`);
        if (!Array.isArray(envelope?.Pages)) throw new Error("Yuanbao response missing Pages array");
        envelope.Pages.slice(0, maxSources).forEach((page: unknown, index: number) => addSource(out, index, () => {
          const p = typeof page === "string" ? JSON.parse(page) : page;
          const parsed = z.object({ url: z.string(), title: z.string().nullish(), passage: z.string().nullish(), snippet: z.string().nullish(), abstract: z.string().nullish() }).parse(p);
          return { url: parsed.url, title: parsed.title ?? null, snippet: parsed.passage ?? parsed.snippet ?? parsed.abstract ?? null };
        }));
      }
    } catch (error) { out.status = "FAILED"; out.error = failure(signal.aborted ? signal.reason : error); }
    const result = finish(out);
    parent.throwIfAborted();
    return result;
  }

  async function searchCommunity(query: string, _identity?: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context); const out = record("hacker-news-algolia", query);
    try {
      const response = await request(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${maxSources}`, signal, {}, out.id);
      if (response.status !== 200) throw new Error(`HN search HTTP ${response.status}`);
      const data = JSON.parse(response.text);
      if (!Array.isArray(data.hits)) throw new Error("HN search missing hits");
      data.hits.slice(0, maxSources).forEach((hit: unknown, index: number) => addSource(out, index, () => {
        const p = z.object({ objectID: z.string().regex(/^\d+$/), title: z.string().nullish(), story_text: z.string().nullish() }).parse(hit);
        return { url: `https://news.ycombinator.com/item?id=${p.objectID}`, title: p.title ?? null, snippet: p.story_text ?? null };
      }));
    } catch (error) { out.status = "FAILED"; out.error = failure(signal.aborted ? signal.reason : error); }
    const result = finish(out);
    parent.throwIfAborted();
    return result;
  }

  async function searchWeb(query: string, _identity?: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context); const out = record("bing-rss-public-search", query);
    try {
      const response = await request(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, signal, {}, out.id);
      if (response.status !== 200) throw new Error(`Web search HTTP ${response.status}`);
      const $ = load(response.text, { xml: true });
      if (!$("rss").length) throw new Error("Search response is not RSS");
      $("item").slice(0, maxSources).toArray().forEach((el, index) => addSource(out, index, () => ({ url: $(el).find("link").text(),
        title: $(el).find("title").text(), snippet: load($(el).find("description").text()).text() })));
    } catch (error) { out.status = "FAILED"; out.error = failure(signal.aborted ? signal.reason : error); }
    const result = finish(out);
    parent.throwIfAborted();
    return result;
  }

  async function searchSecondary(query: string, _identity?: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context);
    const key = process.env.TAVILY_API_KEY?.trim();
    const out = record(key ? "tavily-search-api" : "tavily-search-api:keyless-capped", query);
    try {
      const response = await request("https://api.tavily.com/search", signal, { method: "POST",
        headers: { "Content-Type": "application/json", "X-Client-Source": "waytoagi-collection",
          ...(key ? { Authorization: `Bearer ${key}` } : { "X-Tavily-Access-Mode": "keyless" }) },
        body: JSON.stringify({ query, search_depth: "basic", max_results: maxSources, include_answer: false, include_raw_content: false }) }, out.id);
      if (response.status !== 200) throw new Error(`Tavily search HTTP ${response.status}${key ? "" : "; capped keyless access unavailable; configure TAVILY_API_KEY for authenticated search"}`);
      const body = JSON.parse(response.text);
      if (body.error) throw new Error(`Tavily service error${key ? "" : "; keyless limit/access failure; configure TAVILY_API_KEY"}`);
      if (!Array.isArray(body.results)) throw new Error("Tavily response missing results array");
      body.results.slice(0, maxSources).forEach((result: unknown, index: number) => addSource(out, index, () => {
        const p = z.object({ url: z.string(), title: z.string().nullish(), content: z.string().nullish() }).parse(result);
        return { url: p.url, title: p.title ?? null, snippet: p.content ?? null };
      }));
    } catch (error) { out.status = "FAILED"; out.error = failure(signal.aborted ? signal.reason : error); }
    const result = finish(out);
    parent.throwIfAborted();
    return result;
  }

  async function fetchSource(url: string, context: CollectionContext = {}): Promise<Evidence> {
    const { signal, parent } = operation(context);
    const out = emptyEvidence(url);
    const finishEvidence = () => {
      const parsed = EvidenceSchema.parse(out);
      evidenceRecords.push(parsed);
      return parsed;
    };
    try {
      const u = new URL(url);
      let requestUrl = url;
      const tweet = /^(?:www\.)?(?:x\.com|twitter\.com)$/.test(u.hostname) ? u.pathname.match(/^\/[^/]+\/status\/(\d+)/)?.[1] : null;
      const hnId = u.hostname === "news.ycombinator.com" && u.pathname === "/item" ? u.searchParams.get("id") : null;
      if (hnId && /^\d+$/.test(hnId)) requestUrl = `https://hn.algolia.com/api/v1/items/${hnId}`;
      if (tweet) {
        if (!process.env.X_BEARER_TOKEN) { out.readStatus = "RESTRICTED"; out.readError = "X post requires configured X_BEARER_TOKEN; HTML shell is not post text"; return finishEvidence(); }
        requestUrl = `https://api.x.com/2/tweets/${tweet}?tweet.fields=created_at,author_id,lang`;
      }
      const response = await request(requestUrl, signal, tweet ? { headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` } } : {}, out.id);
      out.retrievedAt = now();
      if (response.status !== 200) {
        out.readStatus = [401, 403, 429, 451].includes(response.status) ? "RESTRICTED" : "FAILED";
        out.readError = `Source HTTP ${response.status}`; return finishEvidence();
      }
      let extracted;
      if (tweet) {
        const data = JSON.parse(response.text).data;
        if (typeof data?.text !== "string" || !data.text.trim()) throw new Error("X response contains no post text");
        const excerpt = data.text.slice(0, 300).trim();
        extracted = { title: null, author: clean(data.author_id), language: clean(data.lang), publishedAt: null,
          excerpt, locator: `X status ${tweet}; API $.data.text UTF-16 [0,${excerpt.length})`, context: null };
        out.metadata.sourceType = "COMMUNITY"; out.metadata.contentKind = "UNKNOWN";
      } else if (hnId) {
        type HnItem = { id: number; author: string | null; created_at: string | null; text: string | null; title?: string; url?: string; children?: HnItem[] };
        const item = JSON.parse(response.text) as HnItem;
        const comments: { item: HnItem; path: string; text: string }[] = [];
        function walk(node: HnItem, path: string) {
          if (comments.length >= 500) return;
          if (typeof node.text === "string") {
            const text = clean(load(node.text).text());
            if (text) comments.push({ item: node, path, text });
          }
          node.children?.forEach((child, index) => walk(child, `${path}.children[${index}]`));
        }
        walk(item, "$");
        const terms = (context.question ?? options.question ?? "").toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
        const chosen = comments.find(c => terms.some(t => c.text.toLowerCase().includes(t))) ?? comments[0];
        if (!chosen) throw new Error("HN story contains no readable original comments");
        const excerpt = chosen.text.slice(0, 300).trim();
        const created = chosen.item.created_at;
        extracted = { title: clean(item.title), author: clean(chosen.item.author), language: null,
          publishedAt: created && Number.isFinite(Date.parse(created)) ? new Date(created).toISOString() : null,
          excerpt, locator: `HN comment #${chosen.item.id}; API ${chosen.path}.text; normalized UTF-16 [0,${excerpt.length})`, context: chosen.text.slice(0, 500) };
        out.metadata.sourceType = "COMMUNITY"; out.metadata.contentKind = "UNKNOWN";
        if (item.url) { try { out.metadata.upstreamUrl = publicUrl(item.url).href; } catch { /* Unknown/unsupported upstream stays null. */ } }
      } else {
        if (!/text\/html|application\/xhtml\+xml/.test(response.contentType)) throw new Error("Unsupported source media; HTML required");
        const charset = response.contentType.match(/charset=([^;\s]+)/i)?.[1];
        if (charset && !/^['"]?utf-8['"]?$/i.test(charset)) throw new Error("Unsupported source encoding; UTF-8 required");
        if (/captcha|verify you are human|just a moment|access denied/i.test(response.text.slice(0, 12000))) {
          out.readStatus = "RESTRICTED"; out.readError = "Source returned access challenge"; return finishEvidence();
        }
        extracted = extractHtml(response.text, context.question ?? options.question ?? "");
        if (!extracted) throw new Error("No readable article blocks; JavaScript shell/empty page is not original material");
        const official = context.officialWebsite;
        if (official && isOfficialUrl(response.url, official)) {
          out.metadata.sourceType = "OFFICIAL"; out.metadata.contentKind = "OFFICIAL_CLAIM";
          const publisher = new URL(official);
          out.metadata.originGroupId = `official-publisher:${publisher.hostname.replace(/^www\./, "")}${publisher.pathname === "/" ? "" : publisher.pathname.replace(/\/$/, "")}`;
          out.metadata.independenceReason = "Same confirmed official publisher, including language variants and subdomains; not independent experiments. Claim-level shared-origin assessment belongs to verification.";
        } else if (["news.ycombinator.com", "github.com", "www.reddit.com", "reddit.com"].includes(u.hostname)) {
          out.metadata.sourceType = "COMMUNITY";
        }
      }
      out.metadata = { ...out.metadata, title: extracted.title, author: extracted.author, language: extracted.language, publishedAt: extracted.publishedAt };
      out.readStatus = "READ"; out.originalExcerpt = extracted.excerpt;
      out.originalLocation = { kind: tweet || hnId ? "COMMENT" : "TEXT", locator: `${response.url} :: ${extracted.locator}`, context: extracted.context };
      // Hash only the exact persisted excerpt, so consumers can independently recompute it.
      out.contentHash = sha(extracted.excerpt);
    } catch (error) { out.readStatus = "FAILED"; out.readError = failure(signal.aborted ? signal.reason : error); }
    const result = finishEvidence();
    parent.throwIfAborted();
    return result;
  }

  function discoverIdentity(question: string, evidence: Evidence[]): ProductIdentity {
    const identity = unresolvedIdentity(question);
    const matches = evidence.map(e => ({ evidence: e, name: identityName(question, e) })).filter(m => m.name);
    const names = new Set(matches.map(m => m.name!.toLowerCase()));
    if (names.size !== 1) return identity;
    const match = matches[0]!;
    identity.name = match.name!;
    identity.officialWebsite = new URL(match.evidence.originalLocation!.locator.split(" :: ")[0]!).origin;
    identity.confirmationStatus = "CONFIRMED";
    identity.confirmationBasis = matches.map(m => ({ url: m.evidence.sourceUrl, excerpt: m.evidence.originalExcerpt!,
      retrievedAt: m.evidence.retrievedAt,
      reason: "Explicit question name matches publisher domain label and freshly read page title; readable original text retained. Website self-identification, not verified legal ownership; version/plan unknown" }));
    return ProductIdentitySchema.parse(identity);
  }

  async function resolve(question: string, context: CollectionContext = {}): Promise<ProductIdentity> {
    // This is a real, budgeted discovery operation. A2 may instead call discoverIdentity
    // on materials it already collected, avoiding an additional search/read attempt.
    const result = await execute({ query: question, entry: "yuanbao", maxReads: Math.min(3, maxSources) }, { ...context, question });
    return discoverIdentity(question, result.evidence);
  }

  async function readResults(records: RetrievalRecord[], urls: string[], context: CollectionContext, limit: number) {
    const evidence: Evidence[] = [];
    const seen = new Map<string, Evidence>();
    function link() {
      for (const r of records) for (const s of r.returnedSources) {
        const e = seen.get(normalizeSourceUrl(s.url));
        if (e?.readStatus === "READ") { s.adoption = "ADOPTED"; s.adoptionReason = "Original text fetched; relevance and claim support require A2 verification"; s.evidenceId = e.id; }
        else if (e && !["SNIPPET_ONLY", "NOT_FETCHED"].includes(e.readStatus)) {
          s.adoption = "REJECTED"; s.adoptionReason = `Original text unavailable: ${e.readStatus}: ${e.readError}`; s.evidenceId = e.id;
        } else if (e) {
          s.adoptionReason = "Source budget exhausted; search summary is not original evidence"; s.evidenceId = e.id;
        }
      }
    }
    let attempts = 0;
    for (const [index, url] of urls.entries()) {
      try {
        const normalized = normalizeSourceUrl(url);
        if (seen.has(normalized)) continue;
        let e: Evidence;
        if (attempts < limit) { attempts++; e = await fetchSource(normalized, context); }
        else {
          e = emptyEvidence(normalized);
          const source = records.flatMap(r => r.returnedSources).find(s => s.url === normalized);
          e.readStatus = source?.snippet ? "SNIPPET_ONLY" : "NOT_FETCHED";
          e.readError = "Source read budget exhausted; search summary is not original evidence";
          e.metadata.title = source?.title ?? null;
          evidenceRecords.push(e);
        }
        seen.set(normalized, e); evidence.push(e); link();
      } catch (error) {
        overall.throwIfAborted(); context.signal?.throwIfAborted();
        diagnostics.push({ retrievalRecordId: records[0]?.id ?? null, stage: "READ", index,
          error: failure(error) });
      }
    }
    return evidence;
  }

  async function execute(input: CollectionRequest, context: CollectionContext = {}): Promise<CollectionResult> {
    const start = diagnostics.length;
    const entries = { yuanbao: search, bing: searchWeb, hn: searchCommunity, tavily: searchSecondary };
    if (!Object.hasOwn(entries, input.entry)) throw new Error("Unsupported search entry");
    if (input.maxReads !== undefined && (!Number.isInteger(input.maxReads) || input.maxReads < 0 || input.maxReads > 12)) throw new Error("maxReads must be 0..12");
    const r = await entries[input.entry](input.query, undefined, context);
    const evidence = await readResults([r], input.readUrls ?? r.returnedSources.map(s => s.url), context, input.maxReads ?? maxSources);
    return { retrievalRecords: [RetrievalRecordSchema.parse(r)], evidence, diagnostics: diagnostics.slice(start) };
  }

  async function collect(question: string, confirmedIdentity?: ProductIdentity) {
    // Backward-compatible convenience only. Investigation planning belongs to A2.
    let identity = confirmedIdentity ? ProductIdentitySchema.parse(confirmedIdentity) : unresolvedIdentity(question);
    const context = { question, officialWebsite: identity.officialWebsite };
    const records = [await search(question, identity, context), await searchWeb(question, identity, context)];
    const evidence = await readResults(records, records.flatMap(r => r.returnedSources.map(s => s.url)), context, maxSources);
    if (identity.confirmationStatus !== "CONFIRMED") identity = discoverIdentity(question, evidence);
    return { identity, retrievalRecords: records.map(r => RetrievalRecordSchema.parse(r)), evidence, diagnostics: [...diagnostics] };
  }
  // Live journal survives a later cancellation; callers retain completed records.
  const journal = { retrievalRecords, evidence: evidenceRecords, diagnostics, httpAttempts };
  return { resolve, discoverIdentity, search, fetch: fetchSource, searchCommunity, searchWeb, searchSecondary, execute, collect, journal };
}
