import { randomUUID } from "node:crypto";
import type { Completion } from "../../src/server/queue/contracts";

/** Queue mechanics only: no invented source text, search result or user evidence. */
export function emptyCompletion(investigationId: string): Completion {
  const now = new Date().toISOString();
  const snapshotId = randomUUID();
  return {
    snapshot: {
      id: snapshotId, investigationId, version: 1, parentSnapshotId: null,
      productIdentity: { name: "QUEUE TEST ONLY", officialWebsite: null, version: null, plan: null, confirmationStatus: "UNRESOLVED", confirmationBasis: [] },
      evidence: [], claims: [], relations: [], conflicts: [], gaps: [], retrievalRecords: [], generatedAt: now, contractVersion: "1.0.0"
    },
    answer: { id: randomUUID(), snapshotId, body: "QUEUE TEST ONLY: no investigation was performed.", citations: [], generationConfig: { provider: "test-only", model: "test-only", promptVersion: "test-only", temperature: null, generatedAt: now } }
  };
}
