import { z } from "zod";
import { ErrorSchema, IdSchema, TimestampSchema } from "./common";
import { ResearchDepthSchema } from "./research";

export const InvestigationStatusSchema = z.enum(["PENDING", "RUNNING", "AWAITING_CONFIRMATION", "SUCCEEDED", "FAILED", "CANCELLED"]);
export const InvestigationStageSchema = z.enum(["CREATED", "IDENTITY", "RETRIEVAL", "SOURCE_FETCH", "VERIFICATION", "ANSWER", "COMPLETED"]);
export const CreateInvestigationSchema = z.strictObject({ question: z.string().trim().min(1).max(4000), researchDepth: ResearchDepthSchema.default("AUTO") });
export type CreateInvestigation = z.infer<typeof CreateInvestigationSchema>;

export const InvestigationSchema = z.strictObject({
  id: IdSchema,
  question: CreateInvestigationSchema.shape.question,
  researchDepth: ResearchDepthSchema.optional(),
  status: InvestigationStatusSchema,
  stage: InvestigationStageSchema,
  error: ErrorSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  startedAt: TimestampSchema.nullable(),
  completedAt: TimestampSchema.nullable(),
  resultSnapshotId: IdSchema.nullable()
}).superRefine((value, ctx) => {
  if (value.status === "FAILED" && !value.error) ctx.addIssue({ code: "custom", message: "FAILED requires error", path: ["error"] });
  if (value.status === "SUCCEEDED" && (!value.resultSnapshotId || value.stage !== "COMPLETED" || value.error)) ctx.addIssue({ code: "custom", message: "SUCCEEDED requires completed stage, snapshot and no error" });
  if (["FAILED", "CANCELLED", "SUCCEEDED"].includes(value.status) && !value.completedAt) ctx.addIssue({ code: "custom", message: "Terminal status requires completedAt" });
  if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) ctx.addIssue({ code: "custom", message: "updatedAt precedes createdAt" });
});
export type InvestigationStatus = z.infer<typeof InvestigationStatusSchema>;
export type InvestigationStage = z.infer<typeof InvestigationStageSchema>;
export type Investigation = z.infer<typeof InvestigationSchema>;
