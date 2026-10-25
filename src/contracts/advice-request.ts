import { z } from "zod";
import { AdviceSchema, UserConditionsSchema } from "./answer";
import { ErrorSchema, IdSchema, TextSchema, TimestampSchema } from "./common";

export const CreateAdviceRequestSchema = z.strictObject({ snapshotId: IdSchema, userConditions: UserConditionsSchema });
export type CreateAdviceRequest = z.infer<typeof CreateAdviceRequestSchema>;
export const AdviceRequestStatusSchema = z.enum(["PENDING", "RUNNING", "SUCCEEDED", "INSUFFICIENT_CONDITIONS", "FAILED"]);
export const ConditionsIssueSchema = z.strictObject({ message: TextSchema, missingConditions: z.array(TextSchema).min(1) });
export const AdviceRequestSchema = z.strictObject({
  id: IdSchema,
  type: z.literal("ADVICE"),
  investigationId: IdSchema,
  snapshotId: IdSchema,
  userConditions: UserConditionsSchema,
  status: AdviceRequestStatusSchema,
  resultAdviceId: IdSchema.nullable(),
  conditionsIssue: ConditionsIssueSchema.nullable(),
  error: ErrorSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  completedAt: TimestampSchema.nullable()
}).superRefine((value, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: "custom", message });
  const terminal = ["SUCCEEDED", "INSUFFICIENT_CONDITIONS", "FAILED"].includes(value.status);
  if (terminal !== (value.completedAt !== null)) reject("Advice request terminal status requires completedAt; active status forbids it");
  if ((value.status === "SUCCEEDED") !== (value.resultAdviceId !== null)) reject("Only SUCCEEDED advice request requires resultAdviceId");
  if ((value.status === "FAILED") !== (value.error !== null)) reject("Only FAILED advice request requires error");
  if ((value.status === "INSUFFICIENT_CONDITIONS") !== (value.conditionsIssue !== null)) reject("Only INSUFFICIENT_CONDITIONS requires conditionsIssue");
  if (Date.parse(value.updatedAt) < Date.parse(value.createdAt) || (value.completedAt && Date.parse(value.completedAt) < Date.parse(value.createdAt))) reject("Advice request timestamps are inconsistent");
});
export type AdviceRequest = z.infer<typeof AdviceRequestSchema>;
export const AcceptedAdviceRequestSchema = z.strictObject({ adviceRequestId: IdSchema, reused: z.boolean() });
export type AcceptedAdviceRequest = z.infer<typeof AcceptedAdviceRequestSchema>;
export const AdviceRequestDetailSchema = z.strictObject({ request: AdviceRequestSchema, advice: AdviceSchema.nullable() }).superRefine((value, ctx) => {
  const { request, advice } = value;
  if (request.status === "SUCCEEDED") {
    if (!advice || advice.id !== request.resultAdviceId || advice.snapshotId !== request.snapshotId || JSON.stringify(advice.userConditions) !== JSON.stringify(request.userConditions)) ctx.addIssue({ code: "custom", message: "Advice result must match request, snapshot and conditions" });
  } else if (advice) ctx.addIssue({ code: "custom", message: "Unsuccessful request cannot expose an advice result" });
});
export type AdviceRequestDetail = z.infer<typeof AdviceRequestDetailSchema>;
