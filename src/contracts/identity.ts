import { z } from "zod";
import { HttpUrlSchema, TextSchema, TimestampSchema } from "./common";
import { EvidenceSchema } from "./evidence";
import { RetrievalRecordSchema } from "./retrieval";
import { VerificationAuditSchema } from "./verification-audit";

export const IdentityBasisSchema = z.strictObject({
  url: HttpUrlSchema,
  excerpt: TextSchema.max(300),
  retrievedAt: TimestampSchema,
  reason: TextSchema
});
export type IdentityBasis = z.infer<typeof IdentityBasisSchema>;
export const ProductIdentitySchema = z.strictObject({
  name: TextSchema,
  officialWebsite: HttpUrlSchema.nullable(),
  version: TextSchema.nullable(),
  plan: TextSchema.nullable(),
  confirmationStatus: z.enum(["UNRESOLVED", "NEEDS_CONFIRMATION", "CONFIRMED"]),
  confirmationBasis: z.array(IdentityBasisSchema),
  userClarification: TextSchema.max(500).optional()
}).superRefine((value, ctx) => {
  if (value.confirmationStatus === "CONFIRMED" && (!value.officialWebsite || !value.confirmationBasis.length)) ctx.addIssue({ code: "custom", message: "Confirmed identity requires website and basis" });
});
export type ProductIdentity = z.infer<typeof ProductIdentitySchema>;

export const ConfirmationRequestSchema = z.strictObject({
  identity: ProductIdentitySchema.refine((identity) => identity.confirmationStatus === "NEEDS_CONFIRMATION", "Identity must require confirmation"),
  reason: TextSchema.max(4000),
  observations: z.strictObject({ evidence: z.array(EvidenceSchema), retrievalRecords: z.array(RetrievalRecordSchema), verificationAudit: VerificationAuditSchema }).optional()
});
export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;
export const ConfirmedIdentitySchema = ProductIdentitySchema.refine((identity) => identity.confirmationStatus === "CONFIRMED", "Explicitly confirmed identity required");
// A user resolves intent, not evidence: no website or source quote is required.
export const ResumedIdentitySchema = ProductIdentitySchema.refine((identity) => identity.confirmationStatus === "CONFIRMED" || Boolean(identity.userClarification), "Confirmed identity or a short clarification required");
