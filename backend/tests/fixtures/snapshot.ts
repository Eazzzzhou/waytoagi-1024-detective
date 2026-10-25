import { randomUUID, createHash } from "node:crypto";
import type { Answer, EvidenceSnapshot } from "../../src/contracts";

/** Synthetic fixtures exclusively for tests, never imported by application code or seeded. */
export function makeSnapshot(investigationId: string = randomUUID()): EvidenceSnapshot {
  const evidenceId = randomUUID();
  const claimId = randomUUID();
  const timestamp = "2026-10-24T10:00:00.000Z";
  return {
    id: randomUUID(), investigationId, version: 1, parentSnapshotId: null, contractVersion: "1.0.0", generatedAt: timestamp,
    productIdentity: { name: "TEST FIXTURE ONLY", officialWebsite: null, version: null, plan: null, confirmationStatus: "UNRESOLVED", confirmationBasis: [] },
    evidence: [{
      id: evidenceId, sourceUrl: "https://example.com/test-fixture", originalExcerpt: "Synthetic fixture only.", translation: null,
      originalLocation: { kind: "TEXT", locator: "test paragraph 1", context: null },
      metadata: {
        title: "TEST", siteName: "example.com", author: null, publishedAt: null, language: "en", sourceType: "UNKNOWN", contentKind: "UNKNOWN",
        productVersion: null, plan: null, upstreamUrl: null, independence: "UNKNOWN", originGroupId: null, independenceReason: null
      },
      retrievedAt: timestamp, readStatus: "READ", readError: null,
      contentHash: createHash("sha256").update("Synthetic fixture only.").digest("hex")
    }],
    claims: [{ id: claimId, statement: "Synthetic test claim.", kind: "FACT", verificationStatus: "UNVERIFIED", verificationReason: "Fixture only", scope: null }],
    relations: [{ claimId, evidenceId, relation: "CONTEXT", reason: "Fixture relation only" }], conflicts: [], gaps: [], retrievalRecords: []
  };
}

export function makeAnswer(snapshot: EvidenceSnapshot): Answer {
  return {
    id: randomUUID(), snapshotId: snapshot.id, body: "Synthetic test answer [1].",
    citations: [{ marker: "[1]", claimIds: [snapshot.claims[0]!.id], evidenceIds: [snapshot.evidence[0]!.id], quotes: [{ evidenceId: snapshot.evidence[0]!.id, originalExcerpt: snapshot.evidence[0]!.originalExcerpt! }] }],
    generationConfig: { provider: "test-only", model: "test-only", promptVersion: "test-only", temperature: null, generatedAt: snapshot.generatedAt }
  };
}
