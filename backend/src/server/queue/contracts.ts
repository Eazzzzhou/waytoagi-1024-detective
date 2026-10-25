import { z } from "zod";
import { AnswerSchema, ConfirmationRequestSchema, CreateInvestigationSchema, EvidenceSnapshotSchema, IdSchema, TextSchema } from "../../contracts";
export { ConfirmationRequestSchema, ConfirmedIdentitySchema, ResumedIdentitySchema } from "../../contracts/identity";

export const EnqueueSchema = CreateInvestigationSchema.extend({ idempotencyKey: TextSchema.max(200) });
export const ExecutionLeaseSchema = z.strictObject({
  jobId: IdSchema, investigationId: IdSchema, attemptId: IdSchema,
  executionToken: IdSchema, workerId: TextSchema.max(200), expiresAt: z.date()
});
export type ExecutionLease = z.infer<typeof ExecutionLeaseSchema>;

export const CompletionSchema = z.strictObject({ snapshot: EvidenceSnapshotSchema, answer: AnswerSchema }).superRefine((value, ctx) => {
  if (value.answer.snapshotId !== value.snapshot.id) ctx.addIssue({ code: "custom", message: "Answer must belong to submitted snapshot" });
});
export type Completion = z.infer<typeof CompletionSchema>;

export const HandlerResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("COMPLETE"), result: CompletionSchema }),
  z.strictObject({ kind: z.literal("AWAITING_CONFIRMATION"), request: ConfirmationRequestSchema })
]);
export type HandlerResult = z.infer<typeof HandlerResultSchema>;
