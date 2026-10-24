import { z } from "zod";
import { HttpUrlSchema, TextSchema, TimestampSchema } from "./common";

export const IdentityBasisSchema = z.strictObject({
  url: HttpUrlSchema,
  excerpt: TextSchema.max(300),
  retrievedAt: TimestampSchema,
  reason: TextSchema
});
export type IdentityBasis = z.infer<typeof IdentityBasisSchema>;
export const ProductIdentitySchema = z.strictObject({
  name: TextSchema,
  officialWebsite: HttpUrlSchema.nullable(),
  version: TextSchema.nullable(),
  plan: TextSchema.nullable(),
  confirmationStatus: z.enum(["UNRESOLVED", "NEEDS_CONFIRMATION", "CONFIRMED"]),
  confirmationBasis: z.array(IdentityBasisSchema)
}).superRefine((value, ctx) => {
  if (value.confirmationStatus === "CONFIRMED" && (!value.officialWebsite || !value.confirmationBasis.length)) ctx.addIssue({ code: "custom", message: "Confirmed identity requires website and basis" });
});
export type ProductIdentity = z.infer<typeof ProductIdentitySchema>;

export const ConfirmationRequestSchema = z.strictObject({
  identity: ProductIdentitySchema.refine((identity) => identity.confirmationStatus === "NEEDS_CONFIRMATION", "Identity must require confirmation"),
  reason: TextSchema.max(4000)
});
export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;
export const ConfirmedIdentitySchema = ProductIdentitySchema.refine((identity) => identity.confirmationStatus === "CONFIRMED", "Explicitly confirmed identity required");
