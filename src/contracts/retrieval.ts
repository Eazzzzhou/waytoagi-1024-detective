import { z } from "zod";
import { HttpUrlSchema, IdSchema, TextSchema, TimestampSchema } from "./common";

export const RetrievedSourceSchema = z.strictObject({
  url: HttpUrlSchema,
  title: TextSchema.nullable(),
  snippet: TextSchema.nullable(),
  adoption: z.enum(["PENDING", "ADOPTED", "REJECTED"]),
  adoptionReason: TextSchema.nullable(),
  evidenceId: IdSchema.nullable()
}).superRefine((value, ctx) => {
  if (value.adoption === "ADOPTED" && !value.evidenceId) ctx.addIssue({ code: "custom", message: "Adopted source requires evidence reference" });
  if (value.adoption !== "PENDING" && !value.adoptionReason) ctx.addIssue({ code: "custom", message: "Adoption decision requires reason" });
});
export type RetrievedSource = z.infer<typeof RetrievedSourceSchema>;
export const RetrievalRecordSchema = z.strictObject({
  id: IdSchema,
  provider: TextSchema,
  query: TextSchema,
  calledAt: TimestampSchema,
  status: z.enum(["SUCCEEDED", "FAILED"]),
  error: TextSchema.nullable(),
  returnedSources: z.array(RetrievedSourceSchema)
}).superRefine((value, ctx) => {
  if (value.status === "FAILED" && !value.error) ctx.addIssue({ code: "custom", message: "Failed retrieval requires error" });
  if (value.status === "SUCCEEDED" && value.error) ctx.addIssue({ code: "custom", message: "Successful retrieval cannot carry error" });
});
export type RetrievalRecord = z.infer<typeof RetrievalRecordSchema>;
