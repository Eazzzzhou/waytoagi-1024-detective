import { z } from "zod";
import { GenerationConfigSchema, IdSchema, TextSchema, TimestampSchema } from "./common";

export const ModelCallSchema = GenerationConfigSchema.extend({
  id: IdSchema, purpose: TextSchema, startedAt: TimestampSchema,
  durationMs: z.number().int().nonnegative(), outcome: z.enum(["SUCCEEDED", "FAILED"]),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(),
  failureCategory: TextSchema.optional()
});
export type ModelCall = z.infer<typeof ModelCallSchema>;
export const ReviewFindingSchema = z.strictObject({
  claimId: IdSchema.nullable(), evidenceIds: z.array(IdSchema), suggestion: TextSchema,
  decision: z.enum(["ACCEPTED", "REJECTED"]), reason: TextSchema
});
export const InvestigationDecisionSchema = z.strictObject({
  action: z.enum(["SEARCH", "READ", "FINISH", "CLARIFY"]),
  query: TextSchema.max(500).nullable(),
  entries: z.array(z.enum(["yuanbao", "bing", "hn", "tavily"])).max(4),
  readUrls: z.array(z.url()).max(4),
  reason: TextSchema.max(1200), observedGap: TextSchema.max(1200).nullable(),
  basisEvidenceIds: z.array(IdSchema), basisRecordIds: z.array(IdSchema),
  clarification: TextSchema.max(300).nullable(),
  discoveredIdentity: z.strictObject({ name: TextSchema, evidenceId: IdSchema }).nullable()
});
export type InvestigationDecision = z.infer<typeof InvestigationDecisionSchema>;
export const InvestigationLoopAuditSchema = z.strictObject({
  startedAt: TimestampSchema, durationMs: z.number().int().nonnegative(),
  totalBudgetMs: z.number().int().positive(), answerReserveMs: z.number().int().positive(),
  maxSearchRounds: z.number().int().positive(), searchRounds: z.number().int().nonnegative(),
  maxReads: z.number().int().positive(), readsUsed: z.number().int().nonnegative(),
  stopReason: TextSchema,
  decisions: z.array(z.strictObject({
    step: z.number().int().positive(), decidedAt: TimestampSchema,
    remainingMs: z.number().int().nonnegative(), decision: InvestigationDecisionSchema,
    availableEvidenceIds: z.array(IdSchema), availableRecordIds: z.array(IdSchema),
    outcome: z.enum(["EXECUTED", "REJECTED", "STOPPED"]), detail: TextSchema
  })),
  collectionCalls: z.array(z.strictObject({
    operation: TextSchema, target: TextSchema, startedAt: TimestampSchema,
    durationMs: z.number().int().nonnegative(), outcome: z.enum(["SUCCEEDED", "FAILED"]),
    resultId: IdSchema.nullable(), error: TextSchema.nullable()
  }))
});
export const VerificationAuditSchema = z.strictObject({
  modelCalls: z.array(ModelCallSchema),
  review: z.strictObject({
    status: z.enum(["COMPLETED", "NOT_CONFIGURED", "FAILED", "SKIPPED_NO_READABLE_EVIDENCE"]),
    reason: TextSchema, independentAssessment: TextSchema.nullable(), findings: z.array(ReviewFindingSchema)
  }),
  citationChecks: z.array(z.strictObject({ marker: TextSchema, supported: z.boolean(), reason: TextSchema })),
  followup: z.strictObject({ queriesUsed: z.number().int().nonnegative(), maxQueries: z.number().int().nonnegative(), stopReason: TextSchema }),
  investigationLoop: InvestigationLoopAuditSchema.optional()
});
export type VerificationAudit = z.infer<typeof VerificationAuditSchema>;
