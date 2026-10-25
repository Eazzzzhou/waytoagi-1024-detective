import { z } from "zod";
import { AdviceSchema, ConditionsIssueSchema, IdSchema, TextSchema } from "../../contracts";

export const AdviceExecutionLeaseSchema = z.strictObject({
  requestId: IdSchema, investigationId: IdSchema, snapshotId: IdSchema, attemptId: IdSchema,
  executionToken: IdSchema, workerId: TextSchema.max(200), expiresAt: z.date()
});
export type AdviceExecutionLease = z.infer<typeof AdviceExecutionLeaseSchema>;
export const AdviceHandlerResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("COMPLETE"), advice: AdviceSchema }),
  z.strictObject({ kind: z.literal("INSUFFICIENT_CONDITIONS"), issue: ConditionsIssueSchema })
]);
export type AdviceHandlerResult = z.infer<typeof AdviceHandlerResultSchema>;
