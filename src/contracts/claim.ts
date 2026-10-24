import { z } from "zod";
import { IdSchema, TextSchema } from "./common";

export const ClaimSchema = z.strictObject({
  id: IdSchema,
  statement: TextSchema,
  kind: z.enum(["FACT", "OFFICIAL_CLAIM", "USER_REPORT", "OPINION"]),
  verificationStatus: z.enum(["UNVERIFIED", "SUPPORTED", "REFUTED", "DISPUTED", "INSUFFICIENT"]),
  verificationReason: TextSchema,
  scope: TextSchema.nullable()
});
export type Claim = z.infer<typeof ClaimSchema>;
export const EvidenceRelationSchema = z.strictObject({
  claimId: IdSchema,
  evidenceId: IdSchema,
  relation: z.enum(["SUPPORTS", "REFUTES", "CONTEXT", "IRRELEVANT", "UNCERTAIN"]),
  reason: TextSchema
});
export type EvidenceRelation = z.infer<typeof EvidenceRelationSchema>;
export const ConflictSchema = z.strictObject({
  id: IdSchema,
  claimIds: z.array(IdSchema).min(1),
  evidenceIds: z.array(IdSchema).min(2),
  description: TextSchema,
  resolution: TextSchema.nullable()
});
export type Conflict = z.infer<typeof ConflictSchema>;
export const GapSchema = z.strictObject({
  id: IdSchema,
  claimIds: z.array(IdSchema),
  kind: z.enum(["NOT_FETCHED", "READ_FAILED", "NOT_FOUND_IN_SCOPE", "IDENTITY_UNCLEAR", "INSUFFICIENT_EVIDENCE"]),
  description: TextSchema,
  searchScope: TextSchema.nullable()
}).superRefine((value, ctx) => {
  if (value.kind === "NOT_FOUND_IN_SCOPE" && !value.searchScope) ctx.addIssue({ code: "custom", message: "Not found requires explicit search scope" });
});
export type Gap = z.infer<typeof GapSchema>;
