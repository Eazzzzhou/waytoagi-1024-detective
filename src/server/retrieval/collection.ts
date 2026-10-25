import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { z } from "zod";
import { EvidenceSchema, ProductIdentitySchema, RetrievalRecordSchema, RetrievedSourceSchema,
  type Evidence, type ProductIdentity, type RetrievalRecord } from "../../contracts";
import { publicUrl, requestText } from "./http";

export interface CollectionContext { signal?: AbortSignal; timeoutMs?: number; question?: string; officialWebsite?: string | null }
export interface CollectionOptions extends CollectionContext { maxSources?: number; yuanbaoImportPath?: string }
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
// Domain hints only; never evidence/answers. Every confirmation reads the website afresh.
const products = [
  { name: "Dify", aliases: /\bdify\b/i, url: "https://dify.ai" },
  { name: "GitHub Copilot", aliases: /github\s+copilot/i, url: "https://github.com/features/copilot" },
  { name: "Amazon Q Developer", aliases: /amazon\s+q\s+developer/i, url: "https://aws.amazon.com/q/developer/" },
  { name: "Devin", aliases: /\bdevin\b/i, url: "https://devin.ai" },
  { name: "Cursor", aliases: /\bcursor\b/i, url: "https://cursor.com" },
  { name: "Claude", aliases: /\bclaude\b/i, url: "https://claude.ai" },
  { name: "ChatGPT", aliases: /\bchatgpt\b/i, url: "https://chatgpt.com" }
];

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
  const terms = [...new Set(question.toLowerCase().match(/[a-z][a-z0-9_-]{2,}|[\u4e00-\u9fff]{2,4}/g) ?? [])];
  const blocks = root.find("p,li,pre,td,h1,h2,h3").toArray().map((el, index) => ({ el, index }))
    .filter(({ el }) => !$(el).find("p,li,pre,td,h1,h2,h3").length).map(({ el, index }) => ({
      text: clean($(el).text()) ?? "", locator: `${rootSelector} :: blocks(p,li,pre,td,h1,h2,h3)[${index}]`
    })).filter(b => b.text.length >= 30);
  const ranked = blocks.map(b => ({ ...b, score: terms.reduce((s, t) => s + (b.text.toLowerCase().includes(t) ? t.length : 0), 0) })).sort((a, b) => b.score - a.score);
  const chosen = ranked[0];
  if (!chosen) return null;
  // Center a <=300-character contiguous excerpt on the first matched query term.
  const match = terms.map(t => chosen.text.toLowerCase().indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, match - 80);
  const excerpt = chosen.text.slice(start, start + 300).trim();
  const offset = chosen.text.indexOf(excerpt, start);
  return { title, author, language, publishedAt, excerpt, locator: `${chosen.locator}; normalized UTF-16 [${offset},${offset + excerpt.length})`,
    context: chosen.text.slice(Math.max(0, offset - 100), offset + excerpt.length + 100) };
}

export function createCollectionProviders(options: CollectionOptions = {}) {
  const totalMs = options.timeoutMs ?? 60_000;
  if (!Number.isInteger(totalMs) || totalMs < 1 || totalMs > 300_000) throw new Error("Collection budget must be 1..300000ms");
  const budget = AbortSignal.timeout(totalMs);
  const overall = options.signal ? AbortSignal.any([options.signal, budget]) : budget;
  const maxSources = Math.min(12, Math.max(1, options.maxSources ?? 6));
  function operation(context: CollectionContext = {}) {
    const parent = context.signal ? AbortSignal.any([overall, context.signal]) : overall;
    const signal = AbortSignal.any([parent, AbortSignal.timeout(Math.min(context.timeoutMs ?? 15_000, 30_000))]);
    parent.throwIfAborted();
    return { parent, signal };
  }
  function failure(error: unknown, parent: AbortSignal) {
    // Cancellation / total deadline must escape to the Worker; individual failures are records.
    parent.throwIfAborted();
    if (error instanceof Error && error.name === "TimeoutError") return "Request time budget exhausted";
    return error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500) : "Unknown collection failure";
  }
  function record(provider: string, query: string): RetrievalRecord {
    return { id: randomUUID(), provider, query, calledAt: now(), status: "SUCCEEDED", error: null, returnedSources: [] };
  }

  async function search(query: string, _identity: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
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
        const response = await requestText(WSA, signal, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ Query: query }) });
        if (response.status !== 200) throw new Error(`Yuanbao search HTTP ${response.status}`);
        const envelope = JSON.parse(response.text).Response;
        if (envelope?.Error) throw new Error(`Yuanbao service ${String(envelope.Error.Code ?? "UNKNOWN")}`);
        if (!Array.isArray(envelope?.Pages)) throw new Error("Yuanbao response missing Pages array");
        for (const page of envelope.Pages.slice(0, maxSources)) {
          const p = typeof page === "string" ? JSON.parse(page) : page;
          out.returnedSources.push({ url: publicUrl(p.url).href, title: clean(p.title), snippet: clean(p.passage ?? p.snippet ?? p.abstract), adoption: "PENDING", adoptionReason: null, evidenceId: null });
        }
      }
    } catch (error) { out.status = "FAILED"; out.error = failure(error, parent); }
    return RetrievalRecordSchema.parse(out);
  }

  async function searchCommunity(query: string, _identity: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context); const out = record("hacker-news-algolia", query);
    try {
      const response = await requestText(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${maxSources}`, signal);
      if (response.status !== 200) throw new Error(`HN search HTTP ${response.status}`);
      const data = JSON.parse(response.text);
      if (!Array.isArray(data.hits)) throw new Error("HN search missing hits");
      out.returnedSources = data.hits.map((hit: { objectID: string; title?: string; story_text?: string }) => ({
        url: `https://news.ycombinator.com/item?id=${encodeURIComponent(hit.objectID)}`, title: clean(hit.title), snippet: clean(hit.story_text), adoption: "PENDING", adoptionReason: null, evidenceId: null
      }));
    } catch (error) { out.status = "FAILED"; out.error = failure(error, parent); }
    return RetrievalRecordSchema.parse(out);
  }

  async function searchWeb(query: string, _identity: ProductIdentity, context: CollectionContext = {}): Promise<RetrievalRecord> {
    const { signal, parent } = operation(context); const out = record("bing-rss-public-search", query);
    try {
      const response = await requestText(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, signal);
      if (response.status !== 200) throw new Error(`Web search HTTP ${response.status}`);
      const $ = load(response.text, { xml: true });
      if (!$("rss").length) throw new Error("Search response is not RSS");
      out.returnedSources = $("item").slice(0, maxSources).toArray().map(el => ({ url: publicUrl($(el).find("link").text()).href,
        title: clean($(el).find("title").text()), snippet: clean(load($(el).find("description").text()).text()), adoption: "PENDING", adoptionReason: null, evidenceId: null }));
    } catch (error) { out.status = "FAILED"; out.error = failure(error, parent); }
    return RetrievalRecordSchema.parse(out);
  }

  async function fetchSource(url: string, context: CollectionContext = {}): Promise<Evidence> {
    const { signal, parent } = operation(context);
    const out = emptyEvidence(url);
    try {
      const u = new URL(url);
      let requestUrl = url;
      const tweet = /^(?:www\.)?(?:x\.com|twitter\.com)$/.test(u.hostname) ? u.pathname.match(/^\/[^/]+\/status\/(\d+)/)?.[1] : null;
      const hnId = u.hostname === "news.ycombinator.com" && u.pathname === "/item" ? u.searchParams.get("id") : null;
      if (hnId && /^\d+$/.test(hnId)) requestUrl = `https://hn.algolia.com/api/v1/items/${hnId}`;
      if (tweet) {
        if (!process.env.X_BEARER_TOKEN) { out.readStatus = "RESTRICTED"; out.readError = "X post requires configured X_BEARER_TOKEN; HTML shell is not post text"; return EvidenceSchema.parse(out); }
        requestUrl = `https://api.x.com/2/tweets/${tweet}?tweet.fields=created_at,author_id,lang`;
      }
      const response = await requestText(requestUrl, signal, tweet ? { headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` } } : {});
      out.retrievedAt = now();
      if (response.status !== 200) {
        out.readStatus = [401, 403, 429, 451].includes(response.status) ? "RESTRICTED" : "FAILED";
        out.readError = `Source HTTP ${response.status}`; return EvidenceSchema.parse(out);
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
          out.readStatus = "RESTRICTED"; out.readError = "Source returned access challenge"; return EvidenceSchema.parse(out);
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
    } catch (error) { out.readStatus = "FAILED"; out.readError = failure(error, parent); }
    return EvidenceSchema.parse(out);
  }

  async function resolve(question: string, context: CollectionContext = {}): Promise<ProductIdentity> {
    const candidates = products.filter(p => p.aliases.test(question));
    const p = candidates.length === 1 ? candidates[0] : undefined;
    const identity: ProductIdentity = { name: p?.name ?? question.slice(0, 120), officialWebsite: p?.url ?? null,
      version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION", confirmationBasis: [] };
    if (p) {
      const evidence = await fetchSource(p.url, { ...context, question: p.name, officialWebsite: p.url });
      if (evidence.readStatus === "READ" && evidence.metadata.sourceType === "OFFICIAL" && evidence.originalExcerpt?.toLowerCase().includes(p.name.toLowerCase())) {
        identity.confirmationBasis.push({ url: evidence.sourceUrl, excerpt: evidence.originalExcerpt, retrievedAt: evidence.retrievedAt,
          reason: "Unique explicit product name in question, matched in freshly read official domain text; version and plan unknown" });
        identity.confirmationStatus = "CONFIRMED";
      }
    }
    return ProductIdentitySchema.parse(identity);
  }

  async function collect(question: string, confirmedIdentity?: ProductIdentity) {
    const identity = confirmedIdentity ? ProductIdentitySchema.parse(confirmedIdentity) : await resolve(question);
    const retrievalRecords: RetrievalRecord[] = []; const evidence: Evidence[] = [];
    if (identity.confirmationStatus !== "CONFIRMED") return { identity, retrievalRecords, evidence };
    const context = { question, officialWebsite: identity.officialWebsite };
    retrievalRecords.push(await search(question, identity, context));
    retrievalRecords.push(await searchWeb(question, identity, context));
    if (/forum|community|experience|user|论坛|社区|用户|体验|评价|争议/i.test(question)) retrievalRecords.push(await searchCommunity(identity.name, identity, context));
    const seen = new Map<string, Evidence>();
    for (const r of retrievalRecords) for (const s of r.returnedSources) {
      let e = seen.get(s.url);
      if (!e && seen.size < maxSources) {
        e = await fetchSource(s.url, context); seen.set(s.url, e); evidence.push(e);
      }
      if (e?.readStatus === "READ") { s.adoption = "ADOPTED"; s.adoptionReason = "Original text fetched; relevance and claim support require A2 verification"; s.evidenceId = e.id; }
      else if (e) { s.adoption = "REJECTED"; s.adoptionReason = `Original text unavailable: ${e.readStatus}`; s.evidenceId = e.id; }
      else {
        const unread = emptyEvidence(s.url); unread.readStatus = s.snippet ? "SNIPPET_ONLY" : "NOT_FETCHED";
        unread.metadata.title = s.title; evidence.push(EvidenceSchema.parse(unread)); seen.set(s.url, unread);
        s.adoptionReason = "Source budget exhausted; search summary is not original evidence";
      }
    }
    return { identity: ProductIdentitySchema.parse(identity), retrievalRecords: retrievalRecords.map(r => RetrievalRecordSchema.parse(r)), evidence: evidence.map(e => EvidenceSchema.parse(e)) };
  }
  return { resolve, search, fetch: fetchSource, searchCommunity, searchWeb, collect };
}
