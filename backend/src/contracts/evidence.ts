import { z } from "zod";
import { HttpUrlSchema, IdSchema, TextSchema, TimestampSchema } from "./common";
import { DocumentReferenceSchema } from "./research";

export const OriginalLocationSchema = z.strictObject({
  kind: z.enum(["TEXT", "COMMENT", "PAGE", "TIMECODE"]),
  locator: TextSchema,
  context: TextSchema.nullable()
});
export type OriginalLocation = z.infer<typeof OriginalLocationSchema>;
export const SourceMetadataSchema = z.strictObject({
  title: TextSchema.nullable(),
  siteName: TextSchema.nullable(),
  author: TextSchema.nullable(),
  publishedAt: TimestampSchema.nullable(),
  language: TextSchema.nullable(),
  sourceType: z.enum(["OFFICIAL", "COMMUNITY", "THIRD_PARTY", "UNKNOWN"]),
  contentKind: z.enum(["FACT", "OFFICIAL_CLAIM", "USER_REPORT", "OPINION", "UNKNOWN"]),
  productVersion: TextSchema.nullable(),
  plan: TextSchema.nullable(),
  upstreamUrl: HttpUrlSchema.nullable(),
  independence: z.enum(["UNKNOWN", "INDEPENDENT", "SHARED_ORIGIN"]),
  originGroupId: TextSchema.nullable(),
  independenceReason: TextSchema.nullable()
}).superRefine((value, ctx) => {
  if (value.independence !== "UNKNOWN" && !value.independenceReason) ctx.addIssue({ code: "custom", message: "Independence assessment requires reason" });
  if (value.independence === "SHARED_ORIGIN" && !value.originGroupId) ctx.addIssue({ code: "custom", message: "Shared origin requires group" });
});
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;
export const EvidenceSchema = z.strictObject({
  id: IdSchema,
  sourceUrl: HttpUrlSchema,
  originalExcerpt: TextSchema.max(300).nullable(),
  translation: TextSchema.nullable(),
  originalLocation: OriginalLocationSchema.nullable(),
  metadata: SourceMetadataSchema,
  retrievedAt: TimestampSchema,
  readStatus: z.enum(["READ", "NOT_FETCHED", "FAILED", "RESTRICTED", "SNIPPET_ONLY"]),
  readError: TextSchema.nullable(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  documentReference: DocumentReferenceSchema.optional()
}).superRefine((value, ctx) => {
  if (value.readStatus === "READ") {
    if (!value.originalExcerpt || !value.originalLocation || !value.contentHash || value.readError) ctx.addIssue({ code: "custom", message: "READ requires excerpt, location, SHA-256 hash and no error" });
  } else if (value.originalExcerpt || value.translation || value.originalLocation || value.contentHash) {
    ctx.addIssue({ code: "custom", message: "Unread source must not masquerade as original evidence" });
  }
  if (["FAILED", "RESTRICTED"].includes(value.readStatus) && !value.readError) ctx.addIssue({ code: "custom", message: "Failed/restricted read requires actual reason (UNKNOWN is allowed)" });
});
export type Evidence = z.infer<typeof EvidenceSchema>;
