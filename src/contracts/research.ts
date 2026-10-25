import { z } from "zod";
import { HttpUrlSchema, IdSchema, TextSchema, TimestampSchema } from "./common";

export const ResearchDepthSchema = z.enum(["AUTO", "FACT", "STANDARD", "DEEP"]);
export type ResearchDepth = z.infer<typeof ResearchDepthSchema>;
export const DocumentReferenceSchema = z.strictObject({
  documentId: TextSchema, version: TextSchema, blockId: TextSchema,
  start: z.number().int().nonnegative(), end: z.number().int().positive(),
  textHash: z.string().regex(/^[a-f0-9]{64}$/), fragmentHash: z.string().regex(/^[a-f0-9]{64}$/)
}).refine(value => value.end > value.start, "Fragment range must be nonempty");
export const ResearchTaskSchema = z.strictObject({
  id: IdSchema, label: TextSchema, required: z.boolean(), requirementAnchor: TextSchema.nullable(),
  parentId: IdSchema.nullable(), evidenceNeed: z.enum(["OFFICIAL", "USE_REPORT", "COUNTEREXAMPLE", "ANY"]),
  status: z.enum(["UNATTEMPTED", "SEARCHED", "PARTIAL", "SUPPORTED", "DISPUTED", "GAP", "NOT_APPLICABLE"]),
  claimIds: z.array(IdSchema), evidenceIds: z.array(IdSchema), attempts: z.number().int().nonnegative(),
  explanation: TextSchema
});
export type ResearchTask = z.infer<typeof ResearchTaskSchema>;
export const ResearchCandidateSchema = z.strictObject({
  id: IdSchema, url: HttpUrlSchema, canonicalUrl: HttpUrlSchema, title: TextSchema.nullable(), snippet: TextSchema.nullable(),
  taskIds: z.array(IdSchema), discoveries: z.array(z.strictObject({
    kind: z.enum(["SEARCH", "DOCUMENT_LINK"]), recordId: IdSchema.nullable(), documentId: TextSchema.nullable(), fromUrl: HttpUrlSchema.nullable()
  })),
  status: z.enum(["UNREAD", "READ", "FAILED", "RESTRICTED", "DUPLICATE"]), documentId: TextSchema.nullable(),
  evidenceIds: z.array(IdSchema), reason: TextSchema.nullable(), tier: z.number().int().min(0).max(3),
  priorityReason: TextSchema, expectedSource: z.enum(["OFFICIAL", "REPORT", "DISCUSSION", "UNKNOWN"])
});
export type ResearchCandidate = z.infer<typeof ResearchCandidateSchema>;
export const ResearchBudgetSchema = z.strictObject({
  profile: z.enum(["FACT", "STANDARD", "DEEP", "COMPARISON"]), totalMs: z.number().int().positive(), reserveMs: z.number().int().positive(),
  searchCalls: z.number().int().positive(), documents: z.number().int().positive(), selections: z.number().int().positive(),
  modelCalls: z.number().int().positive(), explorationTokens: z.number().int().positive(), totalTokens: z.number().int().positive(),
  maxCandidates: z.number().int().positive(), maxActions: z.number().int().positive()
});
export type ResearchBudget = z.infer<typeof ResearchBudgetSchema>;
export const ResearchDocumentIndexSchema = z.strictObject({
  id: TextSchema, version: TextSchema, requestedUrl: HttpUrlSchema, finalUrl: HttpUrlSchema,
  retrievedAt: TimestampSchema, status: TextSchema, textHash: TextSchema.nullable(), rawHash: TextSchema.nullable(),
  manifestPath: TextSchema.nullable(), parser: TextSchema, characters: z.number().int().nonnegative(),
  blockCount: z.number().int().nonnegative(), truncated: z.boolean(), error: TextSchema.nullable()
});
export const ResearchActionSchema = z.strictObject({
  id: IdSchema, kind: z.enum(["PLAN", "SEARCH", "READ", "SELECT", "VERIFY", "SYNTHESIZE", "CLARIFY", "STOP"]),
  startedAt: TimestampSchema, durationMs: z.number().int().nonnegative(),
  taskIds: z.array(IdSchema), basisEvidenceIds: z.array(IdSchema), basisRecordIds: z.array(IdSchema),
  target: TextSchema, reason: TextSchema, gap: TextSchema.nullable(), outcome: z.enum(["SUCCEEDED", "FAILED", "REJECTED", "NO_GAIN", "STOPPED"]),
  recordIds: z.array(IdSchema), documentIds: z.array(TextSchema), evidenceIds: z.array(IdSchema),
  newFragments: z.number().int().nonnegative(), coverageChanges: z.array(TextSchema), cacheHit: z.boolean(), error: TextSchema.nullable()
});
export type ResearchAction = z.infer<typeof ResearchActionSchema>;
export const ResearchAuditSchema = z.strictObject({
  schemaVersion: z.literal("2.0.0"), originalQuestion: TextSchema, intent: z.enum(["FACT", "USE_CASE", "COMPARISON", "OUT_OF_SCOPE"]),
  budget: ResearchBudgetSchema, startedAt: TimestampSchema, durationMs: z.number().int().nonnegative(), stopReason: TextSchema,
  tasks: z.array(ResearchTaskSchema).max(40), candidates: z.array(ResearchCandidateSchema).max(500),
  documents: z.array(ResearchDocumentIndexSchema).max(80), actions: z.array(ResearchActionSchema).max(200),
  counts: z.strictObject({ searchCalls: z.number().int().nonnegative(), documentFetches: z.number().int().nonnegative(),
    cacheSelections: z.number().int().nonnegative(), duplicateFragments: z.number().int().nonnegative(),
    modelCalls: z.number().int().nonnegative(), inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(),
    unknownUsageCalls: z.number().int().nonnegative(), noGainBatches: z.number().int().nonnegative() }),
  recommendation: z.strictObject({ eligible: z.boolean(), independentReports: z.number().int().nonnegative(), sites: z.array(TextSchema), reason: TextSchema }),
  httpAttempts: z.array(z.strictObject({ url: HttpUrlSchema, method: TextSchema, startedAt: TimestampSchema, finishedAt: TimestampSchema.nullable(), requestSent: z.boolean(), status: z.number().int().nullable(), error: TextSchema.nullable(), ownerId: TextSchema.nullable() })).max(1000).optional(),
  diagnostics: z.array(TextSchema).max(200)
});
export type ResearchAudit = z.infer<typeof ResearchAuditSchema>;
