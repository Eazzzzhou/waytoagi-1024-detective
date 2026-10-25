import { z } from "zod";
import { GenerationConfigSchema, IdSchema, TextSchema } from "./common";
import type { EvidenceSnapshot } from "./snapshot";

export const CitationQuoteSchema = z.strictObject({
  evidenceId: IdSchema,
  // Preserve exact characters; a quote is not normalized or translated here.
  originalExcerpt: z.string().min(1).max(300)
});
export type CitationQuote = z.infer<typeof CitationQuoteSchema>;

export const CitationSchema = z.strictObject({
  marker: TextSchema,
  claimIds: z.array(IdSchema).min(1),
  evidenceIds: z.array(IdSchema).min(1),
  // Optional when reading legacy v1 answers. New writes require explicit quotes below.
  quotes: z.array(CitationQuoteSchema).min(1).optional()
}).superRefine((citation, ctx) => {
  if (new Set(citation.claimIds).size !== citation.claimIds.length || new Set(citation.evidenceIds).size !== citation.evidenceIds.length) ctx.addIssue({ code: "custom", message: "Duplicate citation reference IDs" });
  if (citation.quotes) {
    const quoteIds = citation.quotes.map((quote) => quote.evidenceId);
    if (new Set(quoteIds).size !== quoteIds.length || quoteIds.length !== citation.evidenceIds.length || quoteIds.some((id) => !citation.evidenceIds.includes(id))) ctx.addIssue({ code: "custom", message: "Answer citation quotes must cover exactly its evidence IDs" });
  }
});
export type Citation = z.infer<typeof CitationSchema>;
export const AnswerSchema = z.strictObject({
  id: IdSchema,
  snapshotId: IdSchema,
  body: TextSchema,
  citations: z.array(CitationSchema),
  generationConfig: GenerationConfigSchema
}).superRefine((value, ctx) => {
  if (new Set(value.citations.map((item) => item.marker)).size !== value.citations.length) ctx.addIssue({ code: "custom", message: "Duplicate citation markers" });
  for (const citation of value.citations) if (!value.body.includes(citation.marker)) ctx.addIssue({ code: "custom", message: "Citation marker missing in answer body" });
});
export type Answer = z.infer<typeof AnswerSchema>;

/** Structural referential/quote integrity only. It does not judge factual or semantic support. */
export function assertAnswerReferences(answer: Answer, snapshot: EvidenceSnapshot, requireQuotes = true): void {
  const issues: z.core.$ZodIssue[] = [];
  const issue = (index: number, message: string) => issues.push({ code: "custom", message, path: ["citations", index] });
  if (answer.snapshotId !== snapshot.id) issues.push({ code: "custom", message: "Answer snapshot reference does not match", path: ["snapshotId"] });
  const claims = new Set(snapshot.claims.map((claim) => claim.id));
  const evidence = new Map(snapshot.evidence.map((item) => [item.id, item]));
  answer.citations.forEach((citation, index) => {
    if (citation.claimIds.some((id) => !claims.has(id)) || citation.evidenceIds.some((id) => evidence.get(id)?.readStatus !== "READ")) issue(index, "Answer citation must refer to claims and readable original evidence in its snapshot");
    if (requireQuotes && !citation.quotes) issue(index, "New answer citation requires explicit original quotes");
    for (const quote of citation.quotes ?? []) {
      if (evidence.get(quote.evidenceId)?.originalExcerpt !== quote.originalExcerpt) issue(index, "Answer citation original quote must exactly match the saved evidence excerpt");
    }
  });
  if (issues.length) throw new z.ZodError(issues);
}
export const UserConditionsSchema = z.strictObject({
  useCase: TextSchema,
  experience: TextSchema.nullable(),
  budget: TextSchema.nullable(),
  requirements: z.array(TextSchema)
});
export type UserConditions = z.infer<typeof UserConditionsSchema>;
export const AdviceSchema = z.strictObject({
  id: IdSchema,
  snapshotId: IdSchema,
  userConditions: UserConditionsSchema,
  content: TextSchema,
  generationConfig: GenerationConfigSchema
});
export type Advice = z.infer<typeof AdviceSchema>;
