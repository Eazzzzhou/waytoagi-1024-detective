import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { EvidenceSnapshot, ResearchAudit } from "../../src/contracts";
import type { ModelProvider, ModelRequest } from "../../src/server/models";
import { BUDGETS } from "../../src/server/research/budget";
import { createResearchVerifier } from "../../src/server/research/verification";
import { reviewResearch } from "../../src/server/research/review";
import { createResearchHandler } from "../../src/server/research/engine";
import { makeSnapshot } from "../fixtures/snapshot";

function audit(): ResearchAudit {
  return { schemaVersion: "2.0.0", originalQuestion: "Synthetic question", intent: "FACT", budget: BUDGETS.STANDARD, startedAt: new Date().toISOString(), durationMs: 0, stopReason: "Synthetic", tasks: [{ id: randomUUID(), label: "Synthetic task", requirementAnchor: null, required: true, parentId: null, evidenceNeed: "ANY", status: "UNATTEMPTED", claimIds: [], evidenceIds: [], attempts: 0, explanation: "Synthetic" }], candidates: [], documents: [], actions: [], counts: { searchCalls: 0, documentFetches: 0, cacheSelections: 0, duplicateFragments: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, unknownUsageCalls: 0, noGainBatches: 0 }, recommendation: { eligible: false, independentReports: 0, sites: [], reason: "Synthetic" }, diagnostics: [] };
}
const config = (model: string) => ({ provider: "test-only", model, promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() });
const input = (request: ModelRequest<unknown>) => JSON.parse(request.prompt.split("\n").at(-1)!);
function materials(count: number) {
  const snapshot = makeSnapshot();
  const template = snapshot.evidence[0]!;
  snapshot.claims = []; snapshot.relations = [];
  snapshot.evidence = Array.from({ length: count }, (_, i) => {
    const originalExcerpt = `Synthetic fact ${i}.`;
    return { ...template, id: randomUUID(), originalExcerpt, contentHash: createHash("sha256").update(originalExcerpt).digest("hex") };
  });
  return snapshot;
}
function reviewable(): EvidenceSnapshot {
  const snapshot = makeSnapshot();
  snapshot.research = audit();
  snapshot.research.tasks[0]!.requirementAnchor = snapshot.research.originalQuestion;
  snapshot.claims[0]!.verificationStatus = "SUPPORTED";
  snapshot.relations[0]!.relation = "SUPPORTS";
  snapshot.verificationAudit = { modelCalls: [], review: { status: "NOT_CONFIGURED", reason: "Synthetic", independentAssessment: null, findings: [] }, citationChecks: [], followup: { queriesUsed: 0, maxQueries: 1, stopReason: "Synthetic" } };
  return snapshot;
}
describe("research truncation regressions", () => {
  it("extracts all 40 fragments in bounded batches and does not resend processed rows", async () => {
    const snapshot = materials(40), received: string[][] = [];
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) { received.push(input(request).evidence.map((e: { id: string }) => e.id)); return request.outputSchema.parse({ items: [] }); } };
    const verifier = createResearchVerifier(model, audit());
    await verifier.assess(snapshot, snapshot.evidence, new AbortController().signal, 5000);
    await verifier.assess(snapshot, snapshot.evidence.slice(36), new AbortController().signal, 5000);
    expect(received.map(batch => batch.length)).toEqual([36, 4]);
    expect(new Set(received.flat()).size).toBe(40);
  });
  it("retries a failed tail extraction instead of marking it processed", async () => {
    const snapshot = materials(40);
    let calls = 0;
    const received: number[] = [];
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) { received.push(input(request).evidence.length); if (++calls === 2) throw new Error("Synthetic tail failure"); return request.outputSchema.parse({ items: [] }); } };
    const verifier = createResearchVerifier(model, audit());
    await verifier.assess(snapshot, snapshot.evidence, new AbortController().signal, 5000);
    expect(snapshot.gaps.some(gap => gap.description.includes("4 条原句"))).toBe(true);
    await verifier.assess(snapshot, snapshot.evidence, new AbortController().signal, 5000);
    expect(received).toEqual([36, 4, 4]);
    expect(snapshot.gaps.some(gap => gap.description.startsWith("仍有 "))).toBe(false);
  });
  it("keeps a late existing supporting quote even with 49 newly relevant rows", async () => {
    const snapshot = materials(50), research = audit();
    const claim = { ...makeSnapshot().claims[0]!, verificationStatus: "UNVERIFIED" as const };
    snapshot.claims = [claim];
    snapshot.relations = [{ claimId: claim.id, evidenceId: snapshot.evidence[49]!.id, relation: "SUPPORTS", reason: "Synthetic late proof" }];
    research.candidates = snapshot.evidence.map(evidence => ({ id: randomUUID(), url: evidence.sourceUrl, canonicalUrl: evidence.sourceUrl, title: null, snippet: null, taskIds: [research.tasks[0]!.id], discoveries: [], status: "READ", documentId: null, evidenceIds: [evidence.id], reason: null, tier: 1, priorityReason: "Synthetic", expectedSource: "UNKNOWN" }));
    const verificationInputs: string[][] = [];
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
      const value = input(request);
      if (request.purpose === "v4-claim-extraction") return request.outputSchema.parse({ items: [{ statement: claim.statement, kind: claim.kind, scope: null, taskIds: [research.tasks[0]!.id], evidenceIds: [value.evidence[0].id] }] });
      verificationInputs.push(value.evidence.map((e: { id: string }) => e.id));
      return request.outputSchema.parse({ items: [{ claimId: claim.id, status: "SUPPORTED", reason: "Synthetic late proof", relations: [{ evidenceId: snapshot.evidence[49]!.id, relation: "SUPPORTS", comparable: true, reason: "Synthetic" }] }] });
    } };
    await createResearchVerifier(model, research).assess(snapshot, snapshot.evidence.slice(0, 49), new AbortController().signal, 5000);
    expect(verificationInputs[0]).toContain(snapshot.evidence[49]!.id);
    expect(snapshot.claims[0]!.verificationStatus).toBe("SUPPORTED");
  });
  it("fails missing primary config before constructing retrieval or empty success output", async () => {
    let readerCreated = false;
    const handler = createResearchHandler({ env: {}, reader: () => { readerCreated = true; throw new Error("Must not read"); } });
    await expect(handler({ investigationId: randomUUID(), question: "Synthetic", confirmedIdentity: null, signal: new AbortController().signal, setStage: async () => {} })).rejects.toMatchObject({ detail: { code: "PROVIDER_NOT_CONFIGURED", retryable: false } });
    expect(readerCreated).toBe(false);
  });
});

describe("second-model independent review", () => {
  it("reads evidence without the draft before critique and records no-change completion honestly", async () => {
    const snapshot = reviewable(), order: string[] = [];
    const reviewer: ModelProvider = { config: () => config("reviewer"), async generate<T>(request: ModelRequest<T>) {
      order.push(request.purpose!);
      const value = input(request);
      if (request.purpose === "v4-review-independent") { expect(value.claims).toBeUndefined(); expect(value.evidence[0].quote).toBe(snapshot.evidence[0]!.originalExcerpt); return request.outputSchema.parse({ assessment: "Synthetic independent reading", evidenceIds: [snapshot.evidence[0]!.id] }); }
      expect(value.independent).toHaveLength(1);
      return request.outputSchema.parse({ findings: [] });
    } };
    const main: ModelProvider = { config: () => config("primary"), generate: async () => { throw new Error("No adjudication needed"); } };
    await reviewResearch(snapshot, main, reviewer, new AbortController().signal, 5000);
    expect(order).toEqual(["v4-review-independent", "v4-review-critique"]);
    expect(snapshot.verificationAudit!.review.status).toBe("COMPLETED");
    expect(snapshot.verificationAudit!.review.findings).toEqual([]);
  });
  it.each([false, true])("applies only structurally valid evidence-based corrections (invalid=%s)", async invalid => {
    const snapshot = reviewable(); const claim = snapshot.claims[0]!;
    const reviewer: ModelProvider = { config: () => config("reviewer"), async generate<T>(request: ModelRequest<T>) {
      return request.outputSchema.parse(request.purpose === "v4-review-independent" ? { assessment: "Synthetic", evidenceIds: [snapshot.evidence[0]!.id] } : { findings: [{ claimId: claim.id, evidenceIds: [snapshot.evidence[0]!.id], suggestion: "Synthetic narrower scope" }] });
    } };
    const main: ModelProvider = { config: () => config("primary"), async generate<T>(request: ModelRequest<T>) { return request.outputSchema.parse({ accepted: true, reason: "Synthetic concrete correction", status: "SUPPORTED", scope: "Narrow synthetic scope", relations: [{ ...snapshot.relations[0]!, evidenceId: invalid ? randomUUID() : snapshot.evidence[0]!.id }] }); } };
    await reviewResearch(snapshot, main, reviewer, new AbortController().signal, 5000);
    expect(snapshot.claims[0]!.scope).toBe(invalid ? null : "Narrow synthetic scope");
    expect(snapshot.verificationAudit!.review.findings[0]!.decision).toBe(invalid ? "REJECTED" : "ACCEPTED");
  });
  it("rejects identical model identities, and cancellation propagates", async () => {
    const snapshot = reviewable();
    const same: ModelProvider = { config: () => config("same"), generate: async () => { throw new Error("Must not call"); } };
    await reviewResearch(snapshot, same, same, new AbortController().signal, 5000);
    expect(snapshot.verificationAudit!.review.status).toBe("FAILED");
    const controller = new AbortController(); controller.abort(new Error("Synthetic stop"));
    const second = { ...same, config: () => config("different") };
    await expect(reviewResearch(snapshot, same, second, controller.signal, 5000)).rejects.toThrow("Synthetic stop");
  });
  it("downgrades covered claims without retaining false SUPPORTED task coverage", async () => {
    const snapshot = reviewable(), claim = snapshot.claims[0]!;
    snapshot.research!.tasks[0]!.claimIds = [claim.id];
    snapshot.research!.tasks[0]!.status = "SUPPORTED";
    const reviewer: ModelProvider = { config: () => config("reviewer"), async generate<T>(request: ModelRequest<T>) {
      return request.outputSchema.parse(request.purpose === "v4-review-independent" ? { assessment: "Synthetic partial evidence", evidenceIds: [snapshot.evidence[0]!.id] } : { findings: [{ claimId: claim.id, evidenceIds: [snapshot.evidence[0]!.id], suggestion: "Evidence is insufficient" }] });
    } };
    const main: ModelProvider = { config: () => config("primary"), async generate<T>(request: ModelRequest<T>) { return request.outputSchema.parse({ accepted: true, reason: "Synthetic insufficient scope", status: "INSUFFICIENT", scope: null, relations: [{ ...snapshot.relations[0]!, relation: "CONTEXT" }] }); } };
    await reviewResearch(snapshot, main, reviewer, new AbortController().signal, 5000);
    expect(snapshot.claims[0]!.verificationStatus).toBe("INSUFFICIENT");
    expect(snapshot.research!.tasks[0]!.status).toBe("PARTIAL");
    expect(snapshot.gaps.some(gap => gap.claimIds.includes(claim.id))).toBe(true);
  });
});
