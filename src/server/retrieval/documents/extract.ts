import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { normalizeSourceUrl } from "../http";
import type { DocumentBlock, DocumentLink, SourceDocument } from "./types";

export const PARSER_VERSION = "readability-0.6.0+jsdom-30.1.3+source-dom-2";
export const hashText = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
export const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
const nullable = (text: string | undefined) => text ? normalizeText(text) || null : null;
const timestamp = (value: string | undefined) => value && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

export interface ExtractedDocument {
  text: string; blocks: DocumentBlock[]; links: DocumentLink[]; tables: SourceDocument["tables"];
  metadata: SourceDocument["metadata"]; warnings: string[]; completeness: SourceDocument["completeness"];
}

/** Coordinates come only from saved source DOM text, never Readability's rewritten HTML. */
export function extractDocument(html: string, url: string, maxBlocks = 4000): ExtractedDocument {
  const $ = load(html);
  const metadata: SourceDocument["metadata"] = { title: nullable($("title").first().text()),
    author: nullable($("meta[name='author']").attr("content")), language: nullable($("html").attr("lang")),
    publishedAt: timestamp($("meta[property='article:published_time']").attr("content")) };
  const warnings: string[] = [];
  let articleText = "";
  // jsdom's default does not execute scripts or fetch resources. Never enable either.
  const dom = new JSDOM(html, { url });
  try {
    const article = new Readability(dom.window.document.cloneNode(true) as typeof dom.window.document, { charThreshold: 100, maxElemsToParse: 100_000 }).parse();
    if (article) {
      articleText = normalizeText(article.textContent ?? "");
      metadata.author ??= nullable(article.byline ?? undefined);
      metadata.publishedAt ??= timestamp(article.publishedTime ?? undefined);
      metadata.title ??= nullable(article.title ?? undefined);
    } else warnings.push("Readability found no article; raw DOM structure retained");
  } catch { warnings.push("Readability extraction failed; raw DOM structure retained"); }
  finally { dom.window.close(); }

  const linkElements = $("a[href],link[rel='canonical'][href]").toArray();
  // Do not remove classes named 'header': real specification tables use them.
  $("script,style,noscript,nav,footer,form,svg,template,[hidden],[aria-hidden='true']").remove();
  $("header").not("article header,main header,table header").remove();
  const selector = "h1,h2,h3,h4,h5,h6,p,li,pre,table,blockquote,dt,dd,.commtext,[data-comment-body]";
  const elements: AnyNode[] = [];
  function walk(el: AnyNode) {
    if (el.type === "comment" || !normalizeText($(el).text())) return;
    const node = $(el);
    const atomic = node.is("pre,.commtext,[data-comment-body]") || (node.is("table") && !node.find(".commtext,[data-comment-body]").length);
    if (atomic || (node.is(selector) && !node.find("table,pre,.commtext,[data-comment-body]").length) || !node.find(selector).length) {
      elements.push(el); return;
    }
    node.contents().toArray().forEach(walk);
  }
  $("body").contents().toArray().forEach(walk);
  const blocks: DocumentBlock[] = [];
  const tables: SourceDocument["tables"] = [];
  const ranges = new Map<AnyNode, string>();
  const headings: string[] = [];
  let text = "";
  for (const [index, el] of elements.slice(0, maxBlocks).entries()) {
    const node = $(el);
    const kind = node.is("table") ? "TABLE" : node.is("pre") ? "CODE" : node.is("h1,h2,h3,h4,h5,h6") ? "HEADING" : node.is(".commtext,[data-comment-body]") ? "COMMENT" : node.is("body") ? "TEXT" : "PARAGRAPH";
    const value = kind === "CODE" ? node.text().replace(/\r\n?/g, "\n").trim() : normalizeText(node.text());
    if (!value) continue;
    if (kind === "HEADING") {
      const level = Number((el as Element).tagName.slice(1));
      headings.length = Math.min(headings.length, level - 1); headings.push(value);
    }
    if (text) text += "\n\n";
    const start = text.length; text += value;
    const id = `b${index}`;
    const comment = node.closest("[data-comment-id],.athing.comtr,[id^='comment']");
    const block: DocumentBlock = { id, kind, start, end: text.length, locator: `source DOM normalized block[${index}]`,
      headingPath: [...headings], mainContent: !!articleText && articleText.includes(normalizeText(value)),
      author: nullable(comment.find(".hnuser,[rel='author'],[data-author]").first().text()),
      publishedAt: timestamp(comment.find("time[datetime]").first().attr("datetime")),
      parentId: nullable(comment.attr("data-parent-id")), sourceUrl: null };
    blocks.push(block); ranges.set(el, id);
    if (kind === "TABLE") {
      let rowCursor = 0;
      const rows = node.find("tr").toArray().map(row => {
        const rowText = normalizeText($(row).text());
        const at = value.indexOf(rowText, rowCursor);
        const rowStart = at < 0 ? rowCursor : at; rowCursor = rowStart + rowText.length;
        let cursor = rowStart;
        const cells = $(row).children("th,td").toArray().map(cell => {
          const cellText = normalizeText($(cell).text());
          const found = value.indexOf(cellText, cursor);
          const cellStart = found < 0 ? cursor : found; cursor = cellStart + cellText.length;
          return { text: cellText, start: start + cellStart, end: start + cursor, header: $(cell).is("th"),
            rowSpan: Math.max(1, Number($(cell).attr("rowspan")) || 1), colSpan: Math.max(1, Number($(cell).attr("colspan")) || 1) };
        });
        return { start: start + rowStart, end: start + rowCursor, cells };
      });
      tables.push({ blockId: id, rows });
    }
  }
  if (elements.length > maxBlocks) warnings.push(`Structure truncated at ${maxBlocks} blocks; full raw material remains stored`);
  const links: DocumentLink[] = [];
  const seenLinks = new Set<string>();
  for (const [index, el] of linkElements.entries()) {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#")) continue;
    try {
      const target = normalizeSourceUrl(new URL(href, url).href);
      const relation = $(el).is("link[rel='canonical']") ? "CANONICAL" : "LINK";
      let ancestor: AnyNode | null = el;
      let blockId: string | null = null;
      while (ancestor) { blockId = ranges.get(ancestor) ?? null; if (blockId) break; ancestor = ancestor.parent; }
      if (relation === "LINK" && blockId === null) continue;
      const key = `${target}:${blockId}:${relation}`;
      if (seenLinks.has(key)) continue; seenLinks.add(key);
      links.push({ url: target, text: normalizeText($(el).text()).slice(0, 1000), blockId, relation, locator: `source DOM link[${index}]` });
    } catch { /* Non-public, unsupported or malformed links are not discovery candidates. */ }
  }
  return { text, blocks, tables, links, metadata, warnings, completeness: elements.length > maxBlocks ? "TRUNCATED" : "COMPLETE" };
}

/** Preserve each actual comment, author and parent; the story link is not every comment's upstream. */
export function extractHnDocument(raw: string, sourceUrl: string, maxBlocks = 4000): ExtractedDocument {
  type Item = { id: number; text?: string | null; title?: string; author?: string; created_at?: string; url?: string; children?: Item[] };
  const root = JSON.parse(raw) as Item;
  if (!Number.isInteger(root.id)) throw new Error("HN response missing story ID");
  const result: ExtractedDocument = { text: "", blocks: [], links: [], tables: [], warnings: [], completeness: "COMPLETE",
    metadata: { title: root.title ?? null, author: root.author ?? null, publishedAt: timestamp(root.created_at), language: null } };
  function visit(item: Item, parentId: string | null, path: string) {
    if (result.blocks.length >= maxBlocks) { result.completeness = "TRUNCATED"; return; }
    if (item.text) {
      const $ = load(item.text);
      const value = normalizeText($.text());
      if (value) {
        if (result.text) result.text += "\n\n";
        const start = result.text.length; result.text += value;
        const id = `hn-${item.id}`;
        const isStory = parentId === null && !!item.title;
        result.blocks.push({ id, kind: isStory ? "TEXT" : "COMMENT", start, end: result.text.length, locator: `HN ${isStory ? "story" : "comment"} #${item.id}; JSON ${path}.text`,
          headingPath: [], mainContent: true, author: item.author ?? null, publishedAt: timestamp(item.created_at), parentId,
          sourceUrl: `https://news.ycombinator.com/item?id=${item.id}` });
        $("a[href]").each((index, el) => {
          try { result.links.push({ url: normalizeSourceUrl(new URL($(el).attr("href")!, sourceUrl).href), text: normalizeText($(el).text()), blockId: id,
            relation: "LINK", locator: `HN comment #${item.id}; link[${index}]` }); } catch { /* Invalid links are not candidates. */ }
        });
      }
    }
    item.children?.forEach((child, index) => visit(child, `hn-${item.id}`, `${path}.children[${index}]`));
  }
  visit(root, null, "$");
  if (root.url) { try { result.links.push({ url: normalizeSourceUrl(root.url), text: root.title ?? "", blockId: null, relation: "STORY_UPSTREAM", locator: "HN JSON $.url" }); } catch { /* Unknown remains unknown. */ } }
  if (result.completeness === "TRUNCATED") result.warnings.push(`HN comment extraction truncated at ${maxBlocks}; raw JSON remains stored`);
  return result;
}
