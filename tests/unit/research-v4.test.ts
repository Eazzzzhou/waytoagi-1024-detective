import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EvidenceSnapshotSchema, type Evidence, type ModelCall, type ResearchAudit } from "../../src/contracts";
import { BUDGETS, bounded, budgetFor, budgetModel } from "../../src/server/research/budget";
import { addTask, discoverCandidate, rankCandidates, updateCoverage } from "../../src/server/research/state";
import { createResearchHandler } from "../../src/server/research/engine";
import type { ModelProvider, ModelRequest } from "../../src/server/models";
import type { ResearchDocument, ResearchFragment, ResearchReader } from "../../src/server/research/protocol";
import { makeSnapshot } from "../fixtures/snapshot";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function research(): ResearchAudit {
  return { schemaVersion: "2.0.0", originalQuestion: "limits and fees", intent: "FACT", budget: BUDGETS.FACT, startedAt: new Date().toISOString(), durationMs: 0, stopReason: "Synthetic control", tasks: [{ id: randomUUID(), label: "limits and fees", requirementAnchor: "limits and fees", required: true, parentId: null, evidenceNeed: "ANY", status: "UNATTEMPTED", claimIds: [], evidenceIds: [], attempts: 0, explanation: "Synthetic immutable user question" }], candidates: [], documents: [], actions: [], counts: { searchCalls: 0, documentFetches: 0, cacheSelections: 0, duplicateFragments: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, unknownUsageCalls: 0, noGainBatches: 0 }, recommendation: { eligible: false, independentReports: 0, sites: [], reason: "Synthetic insufficient reports" }, diagnostics: [] };
}

describe("v4 research controls (synthetic only, not external-service acceptance)", () => {
  it("preserves user requirements when new subtasks or misleading complete assignments arrive", () => {
    const audit = research(), root = audit.tasks[0]!;
    const limits = addTask(audit, { label: "limits", requirementAnchor: "limits", required: true, evidenceNeed: "OFFICIAL" }, root.id)!;
    const fees = addTask(audit, { label: "fees", requirementAnchor: "fees", required: true, evidenceNeed: "OFFICIAL" }, root.id)!;
    addTask(audit, { label: "unasked hobby", requirementAnchor: "absent", required: true, evidenceNeed: "ANY" }, root.id);
    const snapshot = makeSnapshot(); snapshot.claims[0]!.verificationStatus = "SUPPORTED"; snapshot.evidence[0]!.metadata.sourceType = "OFFICIAL";
    updateCoverage(audit, snapshot, [{ taskId: limits.id, claimIds: [snapshot.claims[0]!.id], explanation: "Only limits have evidence" }, { taskId: fees.id, claimIds: [randomUUID()], explanation: "Fabricated coverage must not count" }]);
    expect(audit.tasks[0]!.requirementAnchor).toBe("limits and fees");
    expect(audit.tasks[0]!.status).not.toBe("SUPPORTED");
    expect(fees.claimIds).toEqual([]);
    expect(audit.tasks.at(-1)!.required).toBe(false);
  });
  it("ranks an untouched required direction before popular supplementary duplicates", () => {
    const audit = research(), root = audit.tasks[0]!;
    const need = addTask(audit, { label: "fees", requirementAnchor: "fees", required: true, evidenceNeed: "OFFICIAL" }, root.id)!;
    const extra = addTask(audit, { label: "background", requirementAnchor: null, required: false, evidenceNeed: "ANY" }, root.id)!;
    const recordId = randomUUID();
    discoverCandidate(audit, { url: "https://example.com/popular", title: "Popular", taskIds: [extra.id], recordId });
    discoverCandidate(audit, { url: "https://example.com/popular?utm_source=repost", title: "Popular again", taskIds: [extra.id], recordId: randomUUID() });
    const first = discoverCandidate(audit, { url: "https://docs.example.com/fees", taskIds: [need.id], recordId })!;
    expect(audit.candidates).toHaveLength(2);
    expect(rankCandidates(audit)[0]!.id).toBe(first.id);
  });
  it("reserves final tokens, caps usage-less calls, and bounds a non-cooperative adapter", async () => {
    const budget = { ...BUDGETS.FACT, modelCalls: 1 };
    const calls: ModelCall[] = [];
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) { return request.outputSchema.parse({}); } };
    const metered = budgetModel(model, budget, calls, () => 10000);
    const { z } = await import("zod");
    await metered.provider.generate({ prompt: "Synthetic", outputSchema: z.object({}) });
    await expect(metered.provider.generate({ prompt: "Another", outputSchema: z.object({}) })).rejects.toThrow("budget");
    await expect(bounded(new AbortController().signal, 10, () => new Promise(() => {}))).rejects.toThrow("budget");
    expect(budgetFor("复杂用途比较", "DEEP", {}).totalMs).toBe(600000);
    expect(budgetFor("参数", "AUTO", {}).totalMs).toBe(120000);
  });
  it("retains good claims when one sibling is malformed, and reselects cached text without re-fetching", async () => {
    const text = "Synthetic limit is 42 units.\nSynthetic fee is unknown.";
    const document: ResearchDocument = { id: hash("synthetic document"), version: hash(text), requestedUrl: "https://example.com/source", finalUrl: "https://example.com/source", retrievedAt: new Date().toISOString(), status: "READ", readError: null, text, rawHash: hash(text), textHash: hash(text), storage: { manifestPath: ".cache/synthetic-not-delivery.json" }, parser: { name: "synthetic", version: "1" }, completeness: "COMPLETE", warnings: [], metadata: { title: "Synthetic source", author: null, publishedAt: null, language: "en" }, blocks: [{ id: "b1", start: 0, end: text.indexOf("\n"), kind: "PARAGRAPH", headingPath: [] }, { id: "b2", start: text.indexOf("\n") + 1, end: text.length, kind: "PARAGRAPH", headingPath: [] }], links: [] };
    const fragments: ResearchFragment[] = document.blocks.map(block => ({ documentId: document.id, documentVersion: document.version, blockId: block.id, start: block.start, end: block.end, exactText: text.slice(block.start, block.end), fragmentHash: hash(text.slice(block.start, block.end)), sourceUrl: document.finalUrl, locator: block.id, context: text, score: 1 }));
    let fetches = 0, selections = 0, decisions = 0;
    const reader: ResearchReader = { async read() { fetches++; return { document, cacheHit: false }; }, select(_document, input) { selections++; return fragments.filter(fragment => !input.exclude?.some(exclude => exclude.start === fragment.start)); }, toEvidence(_document, fragment): Evidence { return { ...makeSnapshot().evidence[0]!, id: randomUUID(), sourceUrl: document.finalUrl, metadata: { ...makeSnapshot().evidence[0]!.metadata, sourceType: "OFFICIAL" }, originalExcerpt: fragment.exactText, contentHash: fragment.fragmentHash, originalLocation: { kind: "TEXT", locator: fragment.locator, context: text } }; } };
    const model: ModelProvider = { config: () => ({ provider: "synthetic", model: "synthetic", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() }), async generate<T>(request: ModelRequest<T>) {
      const input = JSON.parse(request.prompt.split("\n").at(-1)!);
      let value: unknown;
      if (request.purpose === "v4-research-plan") value = { intent: "FACT", tasks: [{ label: "limits", required: true, requirementAnchor: "limits", evidenceNeed: "OFFICIAL" }, { label: "fees", required: true, requirementAnchor: "fees", evidenceNeed: "OFFICIAL" }], initialQueries: [{ query: "Synthetic limits fees", taskIndexes: [0, 1], secondary: true }], clarification: null };
      else if (request.purpose === "v4-next-research-action") { decisions++; value = { action: decisions === 1 ? "READ" : decisions === 2 ? "SELECT" : "FINISH", searches: [], candidateIds: decisions === 1 ? [input.candidates[0].id] : [], documentIds: decisions === 2 ? [document.id] : [], taskIds: input.tasks.map((task: { id: string }) => task.id), focus: decisions === 2 ? "Synthetic fee followup" : "Synthetic focused fees", reason: "Synthetic gap-driven decision", gap: "Fees still unknown", basisEvidenceIds: input.evidence.map((item: { id: string }) => item.id), basisRecordIds: input.records.map((item: { id: string }) => item.id), newTasks: [], clarification: null }; }
      else if (request.purpose === "v4-claim-extraction") value = { items: [{ statement: "Synthetic limit is 42 units.", kind: "OFFICIAL_CLAIM", scope: "Synthetic only", taskIds: [input.tasks[1].id], evidenceIds: [input.evidence[0].id] }, { statement: "Synthetic fee is 9.", kind: "OFFICIAL_CLAIM", scope: "Synthetic only", taskIds: [input.tasks[2].id], evidenceIds: [input.evidence[1].id] }] };
      else if (request.purpose === "v4-claim-verification-batch") value = { items: [{ claimId: input.claims[0].id, status: "SUPPORTED", reason: "Synthetic exact support", relations: [{ evidenceId: input.evidence[0].id, relation: "SUPPORTS", comparable: true, reason: "Synthetic matching units" }] }, { claimId: input.claims[1].id, status: "BROKEN" }] };
      else if (request.purpose === "v4-single-claim-repair") throw new Error("Synthetic local repair failure");
      else if (request.purpose === "v4-direct-answer-and-analysis") value = { paragraphs: [{ text: "Synthetic limit is 42 units.", claimIds: [input.claims[0].id], kind: "ANSWER", recommendation: false }] };
      else if (request.purpose === "v4-synthesis-semantic-check") value = { items: input.map((item: { index: number }) => ({ index: item.index, supported: true, reason: "Synthetic exact support only" })) };
      else throw new Error(`Unexpected synthetic purpose ${request.purpose}`);
      return request.outputSchema.parse(value);
    } };
    const record = (query: string) => ({ id: randomUUID(), provider: "synthetic", query, calledAt: new Date().toISOString(), status: "SUCCEEDED" as const, error: null, returnedSources: [{ url: document.finalUrl, title: "Synthetic", snippet: "Discovery only", adoption: "PENDING" as const, adoptionReason: null, evidenceId: null }] });
    const handler = createResearchHandler({ reader: () => reader, model, collection: () => ({ search: async query => record(query), searchSecondary: async query => record(query), searchWeb: async query => record(query), searchCommunity: async query => record(query), discoverIdentity: () => makeSnapshot().productIdentity, journal: { retrievalRecords: [], evidence: [], diagnostics: [], httpAttempts: [] } }) });
    const result = await handler({ investigationId: randomUUID(), question: "limits and fees", confirmedIdentity: null, signal: new AbortController().signal, setStage: async () => {} });
    expect(result.kind).toBe("COMPLETE"); if (result.kind !== "COMPLETE") throw Error("Expected synthetic completion");
    const snapshot = EvidenceSnapshotSchema.parse(result.result.snapshot);
    expect(fetches).toBe(1); expect(selections).toBe(2);
    expect(snapshot.claims.map(claim => claim.verificationStatus)).toEqual(["SUPPORTED", "INSUFFICIENT"]);
    expect(result.result.answer.citations).toHaveLength(1);
    expect(result.result.answer.body).toContain("42 units");
    expect(snapshot.research!.tasks[0]!.status).toBe("PARTIAL");
    expect(snapshot.research!.actions.some(action => action.kind === "SELECT" && action.cacheHit && action.outcome === "NO_GAIN")).toBe(true);
  });
});
