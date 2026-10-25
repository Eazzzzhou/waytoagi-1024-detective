import { z } from "zod";
import type { HttpAttempt } from "../http";

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Range = z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() });
export const DocumentBlockSchema = Range.extend({
  id: z.string(), kind: z.enum(["HEADING", "PARAGRAPH", "TABLE", "CODE", "COMMENT", "TEXT"]),
  locator: z.string(), headingPath: z.array(z.string()), mainContent: z.boolean(),
  author: z.string().nullable(), publishedAt: z.string().nullable(), parentId: z.string().nullable(),
  sourceUrl: z.string().nullable()
});
export const DocumentLinkSchema = z.object({
  url: z.string(), text: z.string(), blockId: z.string().nullable(),
  relation: z.enum(["LINK", "CANONICAL", "STORY_UPSTREAM"]), locator: z.string()
});
export const SourceDocumentSchema = z.object({
  schemaVersion: z.literal("source-document/v1"), id: Hash, version: Hash,
  requestedUrl: z.string(), finalUrl: z.string(), retrievedAt: z.string(), contentType: z.string(),
  status: z.enum(["READ", "FAILED", "RESTRICTED"]), readError: z.string().nullable(),
  rawHash: Hash.nullable(), textHash: Hash.nullable(), text: z.string(),
  rawSources: z.array(z.object({ mode: z.string(), hash: Hash, path: z.string().nullable() })),
  storage: z.object({ rawPath: z.string().nullable(), textPath: z.string().nullable(), manifestPath: z.string().nullable() }),
  parser: z.object({ name: z.string(), version: z.string(), normalization: z.literal("source-text/v1"), mode: z.enum(["STATIC", "RENDERED", "HN_JSON", "PLAIN_TEXT"]) }),
  metadata: z.object({ title: z.string().nullable(), author: z.string().nullable(), publishedAt: z.string().nullable(), language: z.string().nullable() }),
  completeness: z.enum(["COMPLETE", "TRUNCATED"]), warnings: z.array(z.string()),
  blocks: z.array(DocumentBlockSchema), links: z.array(DocumentLinkSchema),
  tables: z.array(z.object({ blockId: z.string(), rows: z.array(Range.extend({ cells: z.array(Range.extend({
    text: z.string(), header: z.boolean(), rowSpan: z.number().int().positive(), colSpan: z.number().int().positive()
  })) })) }))
}).superRefine((document, ctx) => {
  if (document.status === "READ" && (!document.text || !document.blocks.length || !document.rawHash || !document.textHash || document.readError)) {
    ctx.addIssue({ code: "custom", message: "READ document requires saved original text, blocks, raw/text hashes and no read error" });
  }
  if (document.status !== "READ" && (document.text || document.blocks.length || document.textHash || !document.readError)) {
    ctx.addIssue({ code: "custom", message: "Failed documents retain errors and cannot masquerade as original text" });
  }
  if (document.blocks.some(block => block.end <= block.start || block.end > document.text.length)) ctx.addIssue({ code: "custom", message: "Document block range is outside saved text" });
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;
export type DocumentLink = z.infer<typeof DocumentLinkSchema>;

export interface DocumentFragment {
  documentId: string; documentVersion: string; blockId: string;
  start: number; end: number; exactText: string; fragmentHash: string;
  sourceUrl: string; locator: string; context: string; score: number;
}
export interface FragmentSelection {
  query: string; maxFragments?: number; maxChars?: number; blockIds?: string[];
  /** Explicitly excluded ranges make repeated selection yield other original passages. */
  exclude?: Pick<DocumentFragment, "documentId" | "documentVersion" | "start" | "end">[];
  signal?: AbortSignal;
}
export interface DocumentReadContext {
  signal?: AbortSignal; timeoutMs?: number; refresh?: boolean; render?: "auto" | "never" | "always";
}
export interface RenderedPage { html: string; finalUrl: string; engine: string; version: string }
export type DocumentRenderer = (url: string, signal: AbortSignal, onAttempt?: (attempt: HttpAttempt) => void) => Promise<RenderedPage>;
export interface DocumentReadResult { document: SourceDocument; cacheHit: boolean }

export interface ReaderAudit {
  action: "READ" | "SELECT" | "LOAD"; url: string | null; documentId: string | null;
  startedAt: string; durationMs: number; cacheHit: boolean; status: string;
  fragmentHashes: string[]; error: string | null;
}
