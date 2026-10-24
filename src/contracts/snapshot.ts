import { z } from "zod";
import { CONTRACT_VERSION, IdSchema, TimestampSchema } from "./common";
import { ProductIdentitySchema } from "./identity";
import { EvidenceSchema } from "./evidence";
import { ClaimSchema, ConflictSchema, EvidenceRelationSchema, GapSchema } from "./claim";
import { RetrievalRecordSchema } from "./retrieval";

export const EvidenceSnapshotSchema = z.strictObject({
  id: IdSchema,
  investigationId: IdSchema,
  version: z.number().int().positive(),
  parentSnapshotId: IdSchema.nullable(),
  productIdentity: ProductIdentitySchema,
  evidence: z.array(EvidenceSchema),
  claims: z.array(ClaimSchema),
  relations: z.array(EvidenceRelationSchema),
  conflicts: z.array(ConflictSchema),
  gaps: z.array(GapSchema),
  retrievalRecords: z.array(RetrievalRecordSchema),
  generatedAt: TimestampSchema,
  contractVersion: z.literal(CONTRACT_VERSION)
}).superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if ((value.version === 1) !== (value.parentSnapshotId === null)) issue("First snapshot has no parent; later versions require parent");
  if (value.parentSnapshotId === value.id) issue("Snapshot cannot parent itself");
  for (const key of ["evidence", "claims", "conflicts", "gaps", "retrievalRecords"] as const) {
    const ids = value[key].map((item) => item.id);
    if (new Set(ids).size !== ids.length) issue(`Duplicate IDs in ${key}`);
  }
  const evidence = new Map(value.evidence.map((item) => [item.id, item]));
  const claims = new Set(value.claims.map((item) => item.id));
  const pairs = value.relations.map((item) => `${item.claimId}:${item.evidenceId}`);
  if (new Set(pairs).size !== pairs.length) issue("Duplicate claim/evidence relation");
  for (const item of value.relations) {
    if (!claims.has(item.claimId) || !evidence.has(item.evidenceId)) issue("Dangling evidence relation");
    if (["SUPPORTS", "REFUTES"].includes(item.relation) && evidence.get(item.evidenceId)?.readStatus !== "READ") issue("Unread source cannot support or refute a claim");
  }
  for (const item of value.conflicts) {
    if (item.claimIds.some((id) => !claims.has(id)) || item.evidenceIds.some((id) => !evidence.has(id))) issue("Dangling conflict reference");
    if (new Set(item.evidenceIds).size < 2) issue("Conflict requires two distinct evidence items");
  }
  for (const item of value.gaps) if (item.claimIds.some((id) => !claims.has(id))) issue("Dangling gap reference");
  for (const record of value.retrievalRecords) for (const source of record.returnedSources) {
    if (source.evidenceId && !evidence.has(source.evidenceId)) issue("Dangling retrieved source reference");
  }
});
export type EvidenceSnapshot = z.infer<typeof EvidenceSnapshotSchema>;
