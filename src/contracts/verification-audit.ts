import { z } from "zod";
import { GenerationConfigSchema, IdSchema, TextSchema, TimestampSchema } from "./common";

export const ModelCallSchema = GenerationConfigSchema.extend({
  id: IdSchema, purpose: TextSchema, startedAt: TimestampSchema,
  durationMs: z.number().int().nonnegative(), outcome: z.enum(["SUCCEEDED", "FAILED"]),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable()
});
export type ModelCall = z.infer<typeof ModelCallSchema>;
export const ReviewFindingSchema = z.strictObject({
  claimId: IdSchema.nullable(), evidenceIds: z.array(IdSchema), suggestion: TextSchema,
  decision: z.enum(["ACCEPTED", "REJECTED"]), reason: TextSchema
});
export const VerificationAuditSchema = z.strictObject({
  modelCalls: z.array(ModelCallSchema),
  review: z.strictObject({
    status: z.enum(["COMPLETED", "NOT_CONFIGURED", "FAILED", "SKIPPED_NO_READABLE_EVIDENCE"]),
    reason: TextSchema, independentAssessment: TextSchema.nullable(), findings: z.array(ReviewFindingSchema)
  }),
  citationChecks: z.array(z.strictObject({ marker: TextSchema, supported: z.boolean(), reason: TextSchema })),
  followup: z.strictObject({ queriesUsed: z.number().int().nonnegative(), maxQueries: z.number().int().nonnegative(), stopReason: TextSchema })
});
export type VerificationAudit = z.infer<typeof VerificationAuditSchema>;
