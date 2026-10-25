import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AnswerSchema, CreateInvestigationSchema, EvidenceSnapshotSchema, InvestigationSchema } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

describe("input and snapshot runtime contracts", () => {
  it.each([{}, { question: "   " }, { question: 1 }, { question: "x".repeat(4001) }, { question: "valid", admin: true }])("rejects invalid investigation input %j", (input) => {
    expect(CreateInvestigationSchema.safeParse(input).success).toBe(false);
  });
  it("validates a complete fixture and normalizes question whitespace", () => {
    expect(CreateInvestigationSchema.parse({ question: "  real question?  " }).question).toBe("real question?");
    expect(EvidenceSnapshotSchema.parse(makeSnapshot()).contractVersion).toBe("1.0.0");
  });
  it("rejects missing fields and unknown contract versions", () => {
    expect(EvidenceSnapshotSchema.safeParse({ id: randomUUID() }).success).toBe(false);
    expect(EvidenceSnapshotSchema.safeParse({ ...makeSnapshot(), contractVersion: "2.0.0" }).success).toBe(false);
  });
  it("rejects duplicate IDs and dangling references", () => {
    const snapshot = makeSnapshot();
    expect(EvidenceSnapshotSchema.safeParse({ ...snapshot, evidence: [...snapshot.evidence, ...snapshot.evidence] }).success).toBe(false);
    expect(EvidenceSnapshotSchema.safeParse({ ...snapshot, relations: [{ ...snapshot.relations[0], evidenceId: randomUUID() }] }).success).toBe(false);
  });
  it("rejects invented original text for failed reads and unsupported evidence links", () => {
    const snapshot = makeSnapshot();
    snapshot.evidence[0]!.readStatus = "FAILED";
    snapshot.evidence[0]!.readError = "UNKNOWN";
    expect(EvidenceSnapshotSchema.safeParse(snapshot).success).toBe(false);
    Object.assign(snapshot.evidence[0]!, { originalExcerpt: null, translation: null, originalLocation: null, contentHash: null });
    expect(EvidenceSnapshotSchema.safeParse(snapshot).success).toBe(true);
    snapshot.relations[0]!.relation = "SUPPORTS";
    expect(EvidenceSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
  it("rejects executable URLs, unlocated original text and invalid hash", () => {
    const snapshot = makeSnapshot();
    for (const patch of [{ sourceUrl: "javascript:alert(1)" }, { originalLocation: null }, { contentHash: "bad-hash" }]) {
      expect(EvidenceSnapshotSchema.safeParse({ ...snapshot, evidence: [{ ...snapshot.evidence[0], ...patch }] }).success).toBe(false);
    }
  });
  it("requires explicit search scope for a not-found claim", () => {
    const snapshot = makeSnapshot();
    snapshot.gaps.push({ id: randomUUID(), claimIds: [], kind: "NOT_FOUND_IN_SCOPE", description: "Fixture", searchScope: null });
    expect(EvidenceSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
  it("rejects success without a result and failure without an error", () => {
    const base = { id: randomUUID(), question: "test", status: "SUCCEEDED", stage: "COMPLETED", error: null, createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z", startedAt: null, completedAt: "2026-10-24T00:00:00Z", resultSnapshotId: null };
    expect(InvestigationSchema.safeParse(base).success).toBe(false);
    expect(InvestigationSchema.safeParse({ ...base, status: "FAILED" }).success).toBe(false);
  });
  it("validates citation markers and rejects secret-like unrecognized config fields", () => {
    const answer = makeAnswer(makeSnapshot());
    expect(AnswerSchema.safeParse(answer).success).toBe(true);
    expect(AnswerSchema.safeParse({ ...answer, body: "missing marker" }).success).toBe(false);
    expect(AnswerSchema.safeParse({ ...answer, generationConfig: { ...answer.generationConfig, apiKey: "must-never-persist" } }).success).toBe(false);
  });
});
