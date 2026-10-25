import type { Evidence } from "../../contracts";
import type { SourceDocument } from "../retrieval/documents/types";

// Structural seam matches A1's exported source-document/v1; no second document format.
export interface ResearchDocument {
  id: string; version: string; requestedUrl: string; finalUrl: string; retrievedAt: string;
  status: "READ" | "FAILED" | "RESTRICTED"; readError: string | null; text: string;
  rawHash: string | null; textHash: string | null;
  storage: { manifestPath: string | null };
  parser: { name: string; version: string };
  completeness: "COMPLETE" | "TRUNCATED"; warnings: string[];
  metadata: { title: string | null; author: string | null; publishedAt: string | null; language: string | null };
  blocks: { id: string; start: number; end: number; kind: string; headingPath: string[]; locator?: string; sourceUrl?: string | null }[];
  tables?: SourceDocument["tables"];
  links: { url: string; text: string; blockId: string | null; relation: string; locator: string }[];
}
export interface ResearchFragment {
  documentId: string; documentVersion: string; blockId: string; start: number; end: number;
  exactText: string; fragmentHash: string; sourceUrl: string; locator: string; context: string; score: number;
}
export interface ResearchReader {
  journal?: { httpAttempts: { url: string; method: string; startedAt: string; finishedAt: string | null; requestSent: boolean; status: number | null; error: string | null; documentId: string | null }[] };
  load?(id: string): Promise<ResearchDocument>;
  read(url: string, context?: { signal?: AbortSignal; timeoutMs?: number; render?: "auto" | "never" | "always" }): Promise<{ document: ResearchDocument; cacheHit: boolean }>;
  select(document: ResearchDocument, input: { query: string; maxFragments?: number; maxChars?: number; blockIds?: string[]; exclude?: Pick<ResearchFragment, "documentId" | "documentVersion" | "start" | "end">[]; signal?: AbortSignal }): ResearchFragment[] | Promise<ResearchFragment[]>;
  toEvidence(document: ResearchDocument, fragment: ResearchFragment, options?: { officialWebsite?: string | null }): Evidence;
}
