import { randomUUID } from "node:crypto";
import { EvidenceSchema, type Evidence } from "../../../contracts";
import { hashText } from "./extract";
import type { DocumentFragment, FragmentSelection, SourceDocument } from "./types";

const STOP = new Set(["the", "and", "for", "with", "what", "how", "does", "are", "this", "that", "from"]);
function terms(query: string): string[] {
  const latin = (query.toLowerCase().match(/[a-z0-9][a-z0-9_.+-]{1,}/g) ?? []).filter(t => !STOP.has(t));
  const chinese = (query.match(/[\u4e00-\u9fff]+/g) ?? []).flatMap(span => [2, 3, 4].flatMap(n =>
    Array.from({ length: Math.max(0, span.length - n + 1) }, (_, index) => span.slice(index, index + n))));
  return [...new Set([...latin, ...chinese])];
}

export function selectFragments(document: SourceDocument, input: FragmentSelection): DocumentFragment[] {
  input.signal?.throwIfAborted();
  if (document.status !== "READ") return [];
  if (hashText(document.text) !== document.textHash) throw new Error("Document text integrity check failed before selection");
  const limit = input.maxFragments ?? 6;
  const length = input.maxChars ?? 300;
  if (!Number.isInteger(limit) || limit < 0 || limit > 50 || !Number.isInteger(length) || length < 1 || length > 300) throw new Error("Selection requires maxFragments 0..50 and maxChars 1..300");
  const tokens = terms(input.query);
  const frequencies = new Map(tokens.map(token => [token, document.blocks.filter(b => document.text.slice(b.start, b.end).toLowerCase().includes(token)).length]));
  const candidates: DocumentFragment[] = [];
  for (const block of document.blocks) {
    input.signal?.throwIfAborted();
    if (input.blockIds && !input.blockIds.includes(block.id)) continue;
    const original = document.text.slice(block.start, block.end);
    const lower = original.toLowerCase();
    const hits: { at: number; weight: number }[] = [];
    for (const token of tokens) {
      let at = lower.indexOf(token);
      const weight = Math.log(1 + document.blocks.length / (1 + frequencies.get(token)!)) * Math.sqrt(token.length);
      let occurrences = 0;
      while (at >= 0 && occurrences++ < 200) { hits.push({ at, weight }); at = lower.indexOf(token, at + Math.max(1, token.length)); }
    }
    if (tokens.length && !hits.length) continue;
    // Each occurrence can expose a different original passage in a long block.
    const offsets = [...new Set((hits.length ? hits : [{ at: 0, weight: 0 }]).map(hit =>
      original.length <= length ? 0 : Math.min(Math.max(0, hit.at - Math.floor(length / 3)), original.length - length)))];
    for (const offset of offsets) {
      const sliced = original.slice(offset, offset + length);
      const exactText = sliced.trim();
      if (!exactText) continue;
      const start = block.start + offset + sliced.indexOf(exactText);
      const end = start + exactText.length;
      if (input.exclude?.some(e => e.documentId === document.id && e.documentVersion === document.version && e.start < end && e.end > start)) continue;
      const score = hits.filter(h => h.at >= start - block.start && h.at < end - block.start).reduce((sum, h) => sum + h.weight, 0) +
        (block.mainContent ? 0.5 : 0) + (block.kind === "HEADING" ? -0.5 : 0);
      candidates.push({ documentId: document.id, documentVersion: document.version, blockId: block.id, start, end, exactText,
        fragmentHash: hashText(exactText), sourceUrl: block.sourceUrl ?? document.finalUrl,
        locator: `${block.locator}; source-text/v1 UTF-16 [${start},${end})`,
        context: document.text.slice(Math.max(block.start, start - 250), Math.min(block.end, end + 250)), score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.start - b.start);
  const selected: DocumentFragment[] = [];
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (selected.some(other => other.start < candidate.end && other.end > candidate.start)) continue;
    selected.push(candidate);
  }
  return selected;
}

export function validateFragment(document: SourceDocument, fragment: DocumentFragment): void {
  const block = document.blocks.find(b => b.id === fragment.blockId);
  if (document.status !== "READ" || hashText(document.text) !== document.textHash || !Number.isInteger(fragment.start) || !Number.isInteger(fragment.end) ||
    fragment.documentId !== document.id || fragment.documentVersion !== document.version ||
    !block || fragment.start < block.start || fragment.end > block.end || fragment.end <= fragment.start ||
    document.text.slice(fragment.start, fragment.end) !== fragment.exactText || hashText(fragment.exactText) !== fragment.fragmentHash ||
    fragment.sourceUrl !== (block.sourceUrl ?? document.finalUrl)) throw new Error("Fragment does not match the saved document version and original range");
}

export function fragmentToEvidence(document: SourceDocument, fragment: DocumentFragment, context: { officialWebsite?: string | null } = {}): Evidence {
  validateFragment(document, fragment);
  const block = document.blocks.find(b => b.id === fragment.blockId)!;
  const official = context.officialWebsite ? new URL(context.officialWebsite) : null;
  const source = new URL(fragment.sourceUrl);
  const root = official?.hostname.replace(/^www\./, "");
  const isOfficial = !!official && (source.hostname === root || source.hostname.endsWith(`.${root}`)) &&
    (official.pathname === "/" || source.pathname === official.pathname || source.pathname.startsWith(`${official.pathname.replace(/\/$/, "")}/`));
  return EvidenceSchema.parse({ id: randomUUID(), sourceUrl: fragment.sourceUrl,
    originalExcerpt: fragment.exactText, translation: null,
    originalLocation: { kind: block.kind === "COMMENT" ? "COMMENT" : "TEXT",
      locator: `${fragment.sourceUrl} :: document:${document.id}@${document.version} block:${block.id}; source-text/v1 UTF-16 [${fragment.start},${fragment.end}); fragment-sha256:${fragment.fragmentHash}; text-sha256:${document.textHash}`,
      context: fragment.context },
    metadata: { title: document.metadata.title, siteName: source.hostname, author: block.author ?? document.metadata.author,
      publishedAt: block.publishedAt ?? document.metadata.publishedAt, language: document.metadata.language,
      sourceType: isOfficial ? "OFFICIAL" : block.kind === "COMMENT" ? "COMMUNITY" : "UNKNOWN",
      contentKind: isOfficial ? "OFFICIAL_CLAIM" : "UNKNOWN", productVersion: null, plan: null, upstreamUrl: null,
      independence: "UNKNOWN", originGroupId: isOfficial ? `official-publisher:${root}${official!.pathname === "/" ? "" : official!.pathname.replace(/\/$/, "")}` : null,
      independenceReason: isOfficial ? "Same declared official publisher; language/subdomain variants are not independent experiments" : null },
    retrievedAt: document.retrievedAt, readStatus: "READ", readError: null, contentHash: fragment.fragmentHash });
}
