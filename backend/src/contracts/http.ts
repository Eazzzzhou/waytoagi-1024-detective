import { z } from "zod";
import { IdSchema, TextSchema } from "./common";
import { InvestigationSchema } from "./investigation";
import { ConfirmationRequestSchema, ResumedIdentitySchema } from "./identity";
import { EvidenceSnapshotSchema } from "./snapshot";
import { AnswerSchema, assertAnswerReferences } from "./answer";

export const AcceptedInvestigationSchema = z.strictObject({ investigationId: IdSchema, reused: z.boolean() });
export type AcceptedInvestigation = z.infer<typeof AcceptedInvestigationSchema>;
export const RetryAvailabilitySchema = z.strictObject({
  allowed: z.boolean(), reason: TextSchema, remaining: z.number().int().nonnegative(), expectedAttemptCount: z.number().int().nonnegative()
});
export type RetryAvailability = z.infer<typeof RetryAvailabilitySchema>;
export const InvestigationDetailSchema = z.strictObject({
  investigation: InvestigationSchema, identityConfirmation: ConfirmationRequestSchema.nullable(), retry: RetryAvailabilitySchema
});
export type InvestigationDetail = z.infer<typeof InvestigationDetailSchema>;
export const IdentityConfirmationBodySchema = z.strictObject({ identity: ResumedIdentitySchema, expectedAttemptCount: z.number().int().positive() });
export type IdentityConfirmationBody = z.infer<typeof IdentityConfirmationBodySchema>;
export const RetryBodySchema = z.strictObject({ expectedAttemptCount: z.number().int().positive() });
export type RetryBody = z.infer<typeof RetryBodySchema>;
export const SnapshotResponseSchema = z.strictObject({ snapshot: EvidenceSnapshotSchema, answers: z.array(AnswerSchema) }).superRefine((data, ctx) => {
  data.answers.forEach((answer, index) => {
    try { assertAnswerReferences(answer, data.snapshot, false); }
    catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      for (const issue of error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: ["answers", index, ...issue.path] });
    }
  });
});
export type SnapshotResponse = z.infer<typeof SnapshotResponseSchema>;
export const ApiErrorResponseSchema = z.strictObject({ error: z.strictObject({
  code: z.enum(["INVALID_INPUT", "NOT_FOUND", "CONFLICT", "NOT_ALLOWED", "LOCAL_ONLY", "UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "STORAGE_UNAVAILABLE", "INVALID_STORED_DATA", "INTERNAL_ERROR"]), message: TextSchema
}) });
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
