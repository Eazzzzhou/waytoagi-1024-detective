import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EvidenceSnapshotSchema, type Evidence, type ModelCall, type ResearchAudit } from "../../src/contracts";
import { BUDGETS, bounded, budgetFor, budgetModel } from "../../src/server/research/budget";
import { addTask, discoverCandidate, rankCandidates, updateCoverage } from "../../src/server/research/state";
import { createResearchHandler } from "../../src/server/research/engine";
import type { ModelProvider, ModelRequest } from "../../src/server/models";
import type { ResearchDocument, ResearchFragment, ResearchReader } from "../../src/server/research/protocol";
import { makeSnapshot } from "../fixtures/snapshot";
import { createResearchVerifier } from "../../src/server/research/verification";
import { groupOrigins } from "../../src/server/verification";
import { tableFragments } from "../../src/server/research/table-fragments";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function research(): ResearchAudit {
  return { schemaVersion: "2.0.0", originalQuestion: "limits and fees", intent: "FACT", budget: BUDGETS.FACT, startedAt: new Date().toISOString(), durationMs: 0, stopReason: "Synthetic control", tasks: [{ id: randomUUID(), label: "limits and fees", requirementAnchor: "limits and fees", required: true, parentId: null, evidenceNeed: "ANY", status: "UNATTEMPTED", claimIds: [], evidenceIds: [], attempts: 0, explanation: "Synthetic immutable user question" }], candidates: [], documents: [], actions: [], counts: { searchCalls: 0, documentFetches: 0, cacheSelections: 0, duplicateFragments: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, unknownUsageCalls: 0, noGainBatches: 0 }, recommendation: { eligible: false, independentReports: 0, sites: [], reason: "Synthetic insufficient reports" }, diagnostics: [] };
}

describe("v4 research controls (synthetic only, not external-service acceptance)", () => {
  it("reconciles known token usage and preserves budget for a failed claim's final retry", async () => {
    const { z } = await import("zod");
    const calls: ModelCall[] = [];
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
      const timestamp = new Date().toISOString();
      calls.push({ id: randomUUID(), purpose: request.purpose ?? "synthetic", provider: "synthetic", model: "synthetic", promptVersion: "test", temperature: null, generatedAt: timestamp, startedAt: timestamp, durationMs: 1, outcome: "SUCCEEDED", inputTokens: 50, outputTokens: 50 });
      return request.outputSchema.parse({});
    } };
    const meter = budgetModel(model, { ...BUDGETS.FACT, explorationTokens: 9000, totalTokens: 15000 }, calls, () => 10000);
    for (let index = 0; index < 4; index++) await meter.provider.generate({ prompt: "Synthetic actual usage control", outputSchema: z.object({}) });
    expect(calls).toHaveLength(4);

    const audit = research(), snapshot = makeSnapshot(), evidence = snapshot.evidence[0]!;
    snapshot.claims = []; snapshot.relations = [];
    let allowVerification = false;
    const retryModel: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
      const input = JSON.parse(request.prompt.split("\n").at(-1)!);
      if (request.purpose === "v4-claim-extraction") return request.outputSchema.parse({ items: [{ statement: "Synthetic test claim.", kind: "FACT", scope: null, taskIds: [audit.tasks[0]!.id], evidenceIds: [evidence.id] }] });
      if (!allowVerification) throw new Error("Synthetic exploration quota failure");
      return request.outputSchema.parse({ items: [{ claimId: input.claims[0].id, status: "SUPPORTED", reason: "Synthetic final retry succeeded", relations: [{ evidenceId: evidence.id, relation: "SUPPORTS", comparable: true, reason: "Synthetic saved proof" }] }] });
    } };
    const verifier = createResearchVerifier(retryModel, audit);
    await verifier.assess(snapshot, snapshot.evidence, new AbortController().signal, 1000);
    expect(snapshot.claims[0]!.verificationStatus).toBe("INSUFFICIENT");
    allowVerification = true;
    await verifier.assess(snapshot, snapshot.evidence, new AbortController().signal, 1000);
    expect(snapshot.claims[0]!.verificationStatus).toBe("SUPPORTED");
  });
  it("quotes a table's column header and requested row as separate saved ranges", () => {
    const text = "Model Alpha Beta\nContext 42K 84K\nPrice 1 2";
    const rows = text.split("\n").map((line, index) => {
      const start = text.indexOf(line);
      return { start, end: start + line.length, cells: [{ start, end: start + line.length, text: line, header: index === 0, rowSpan: 1, colSpan: 1 }] };
    });
    const document: ResearchDocument = { id: hash("table control"), version: hash(text), requestedUrl: "https://example.com/table", finalUrl: "https://example.com/table", retrievedAt: new Date().toISOString(), status: "READ", readError: null, text, rawHash: hash(text), textHash: hash(text), storage: { manifestPath: null }, parser: { name: "synthetic", version: "1" }, completeness: "COMPLETE", warnings: [], metadata: { title: "Synthetic table", author: null, publishedAt: null, language: "en" }, blocks: [{ id: "table", start: 0, end: text.length, kind: "TABLE", headingPath: [] }], links: [], tables: [{ blockId: "table", rows }] };
    const selected = tableFragments(document, [{ blockId: "table", rows: [2] }], 8, []);
    expect(selected.map(item => item.exactText)).toEqual(["Model Alpha Beta", "Price 1 2"]);
    expect(selected.every(item => document.text.slice(item.start, item.end) === item.exactText)).toBe(true);
    expect(tableFragments(document, [{ blockId: "table", rows: [2] }], 8, selected)).toEqual([]);
  });
  it("counts a copied first-hand report once across sites, while retaining a different experiment by the same author", async () => {
    const reports: Evidence[] = [];
    for (const [index, task] of ["I tested a synthetic assembly containing thirty separate parts and measured every connection.", "I tested a synthetic assembly containing thirty separate parts and measured every connection.", "I tested a different synthetic rendering task with a glass object and measured lighting artifacts."].entries()) {
      const audit = research(), snapshot = makeSnapshot(), evidence = snapshot.evidence[0]!;
      const process = "I wrote a local script, recorded the commands and checked the generated object in the editor.";
      const result = "The saved output contained the requested shape, with one edge requiring a manual correction.";
      evidence.sourceUrl = `https://site${index}.example.org/report`;
      evidence.originalExcerpt = `${task} ${process} ${result}`;
      evidence.contentHash = hash(evidence.originalExcerpt); evidence.metadata.author = "Same synthetic author";
      snapshot.claims = []; snapshot.relations = [];
      const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
        const input = JSON.parse(request.prompt.split("\n").at(-1)!);
        const quote = (text: string) => ({ evidenceId: evidence.id, exactText: text });
        return request.outputSchema.parse(request.purpose === "v4-claim-extraction" ? { items: [{ statement: "The synthetic author reports a completed test with a manual correction.", kind: "USER_REPORT", scope: "Synthetic report", taskIds: [audit.tasks[0]!.id], evidenceIds: [evidence.id] }] } : { items: [{ claimId: input.claims[0].id, status: "SUPPORTED", reason: "Synthetic report", relations: [{ evidenceId: evidence.id, relation: "SUPPORTS", comparable: true, reason: "Synthetic exact proof" }], reportProvenance: { firsthand: true, task: quote(task), process: quote(process), result: quote(result), reason: "Synthetic recorded task/process/result" } }] });
      } };
      await createResearchVerifier(model, audit).assess(snapshot, snapshot.evidence, new AbortController().signal, 1000);
      reports.push(evidence);
    }
    const grouped = groupOrigins(reports, { preserveConfirmedReports: true });
    expect(grouped[0]!.metadata.originGroupId).toBe(grouped[1]!.metadata.originGroupId);
    expect(grouped[2]!.metadata.originGroupId).not.toBe(grouped[0]!.metadata.originGroupId);
  });
  it.each([
    ["Synthetic author", "I tested", "INDEPENDENT"],
    [null, "I tested", "UNKNOWN"],
    ["Synthetic author", "Invented proof", "UNKNOWN"]
  ] as const)("requires saved first-hand proof and author for report independence (%s, %s)", async (author, taskQuote, expected) => {
    const snapshot = makeSnapshot(), audit = research();
    snapshot.claims = []; snapshot.relations = [];
    const evidence = snapshot.evidence[0]!;
    evidence.originalExcerpt = "I tested a synthetic task. I wrote a script. It created a cube.";
    evidence.contentHash = hash(evidence.originalExcerpt);
    evidence.metadata.author = author;
    const model: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
      const input = JSON.parse(request.prompt.split("\n").at(-1)!);
      return request.outputSchema.parse(request.purpose === "v4-claim-extraction" ? { items: [{ statement: "The synthetic author reports creating a cube with a script.", kind: "USER_REPORT", scope: "Synthetic only", taskIds: [audit.tasks[0]!.id], evidenceIds: [evidence.id] }] } : { items: [{ claimId: input.claims[0].id, status: "SUPPORTED", reason: "Synthetic attributed report only", relations: [{ evidenceId: evidence.id, relation: "SUPPORTS", comparable: true, reason: "Synthetic quote" }], reportProvenance: { firsthand: true, task: { evidenceId: evidence.id, exactText: taskQuote }, process: { evidenceId: evidence.id, exactText: "I wrote a script." }, result: { evidenceId: evidence.id, exactText: "It created a cube." }, reason: "Synthetic first-hand task/process/result" } }] });
    } };
    await createResearchVerifier(model, audit).assess(snapshot, snapshot.evidence, new AbortController().signal, 1000);
    expect(evidence.metadata.independence).toBe(expected);
    if (expected === "INDEPENDENT") {
      const duplicate = { ...evidence, id: randomUUID(), metadata: { ...evidence.metadata } };
      const grouped = groupOrigins([evidence, duplicate], { preserveConfirmedReports: true });
      expect(grouped.every(item => item.metadata.independence === "INDEPENDENT")).toBe(true);
      expect(new Set(grouped.map(item => item.metadata.originGroupId)).size).toBe(1);
    }
  });
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
    const purposes: string[] = [];
    const reader: ResearchReader = { async read() { fetches++; return { document, cacheHit: false }; }, select(_document, input) { selections++; return fragments.filter(fragment => !input.exclude?.some(exclude => exclude.start === fragment.start)); }, toEvidence(_document, fragment): Evidence { return { ...makeSnapshot().evidence[0]!, id: randomUUID(), sourceUrl: document.finalUrl, metadata: { ...makeSnapshot().evidence[0]!.metadata, sourceType: "OFFICIAL" }, originalExcerpt: fragment.exactText, contentHash: fragment.fragmentHash, originalLocation: { kind: "TEXT", locator: fragment.locator, context: text } }; } };
    const model: ModelProvider = { config: () => ({ provider: "synthetic", model: "synthetic", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() }), async generate<T>(request: ModelRequest<T>) {
      purposes.push(request.purpose ?? "unknown");
      const input = JSON.parse(request.prompt.split("\n").at(-1)!);
      let value: unknown;
      if (request.purpose === "v4-research-plan") value = { intent: "FACT", tasks: [{ label: "limits", required: true, requirementAnchor: "limits", evidenceNeed: "OFFICIAL" }, { label: "fees", required: true, requirementAnchor: "fees", evidenceNeed: "OFFICIAL" }], initialQueries: [{ query: "Synthetic limits fees", taskIndexes: [0, 1], secondary: true }], clarification: null };

      else if (request.purpose === "v4-next-research-action") { expect(input.claims).toBeUndefined(); expect(input.evidence.every((item: object) => !("quote" in item))).toBe(true); decisions++; value = { action: decisions === 1 ? "READ" : decisions === 2 ? "SELECT" : "FINISH", searches: [], candidateIds: decisions === 1 ? [input.candidates[0].id] : [], documentIds: decisions === 2 ? [document.id] : [], taskIds: input.tasks.map((task: { id: string }) => task.id), focus: decisions === 2 ? "Synthetic fee followup" : "Synthetic focused fees", reason: "Synthetic gap-driven decision", gap: "Fees still unknown", basisEvidenceIds: input.evidence.map((item: { id: string }) => item.id), basisRecordIds: input.records.map((item: { id: string }) => item.id), newTasks: [], clarification: null }; }
      else if (request.purpose === "v4-claim-extraction") value = { items: [{ statement: "Synthetic limit is 42 units.", kind: "OFFICIAL_CLAIM", scope: "Synthetic only", taskIds: [input.tasks[1].id], evidenceIds: [input.evidence[0].id] }, { statement: "Synthetic fee is 9.", kind: "OFFICIAL_CLAIM", scope: "Synthetic only", taskIds: [input.tasks[2].id], evidenceIds: [input.evidence[1].id] }] };
      else if (request.purpose === "v4-claim-verification-batch") value = { items: [{ claimId: input.claims[0].id, status: "SUPPORTED", reason: "Synthetic exact support", relations: [{ evidenceId: input.evidence[0].id, relation: "SUPPORTS", comparable: true, reason: "Synthetic matching units" }] }, { claimId: input.claims[1].id, status: "BROKEN" }] };
      else if (request.purpose === "v4-single-claim-repair") throw new Error("Synthetic local repair failure");
      else if (request.purpose === "v4-direct-answer-and-analysis") value = { paragraphs: [{ text: "Synthetic limit is 42 units.", claimIds: [input.claims[0].id], kind: "ANSWER", recommendation: false }] };
      else if (request.purpose === "v4-synthesis-semantic-check") value = { items: input.map((item: { index: number }) => ({ index: item.index, supported: true, reason: "Synthetic exact support only" })) };
      else throw new Error(`Unexpected synthetic purpose ${request.purpose}`);
      return request.outputSchema.parse(value);
    } };
    const record = (query: string) => ({ id: randomUUID(), provider: "synthetic", query, calledAt: new Date().toISOString(), status: "SUCCEEDED" as const, error: null, returnedSources: [{ url: document.finalUrl, title: "Synthetic", snippet: "Discovery only", adoption: "PENDING" as const, adoptionReason: null, evidenceId: null }] });
    const reviewPurposes: string[] = [];
    model.config = () => ({ provider: "test-only", model: "primary", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() });
    const reviewer: ModelProvider = { config: () => ({ ...model.config!(), model: "reviewer" }), async generate<T>(request: ModelRequest<T>) {
      reviewPurposes.push(request.purpose!);
      const input = JSON.parse(request.prompt.split("\n").at(-1)!);
      return request.outputSchema.parse(request.purpose === "v4-review-independent" ? { assessment: "Synthetic independent reading without draft", evidenceIds: input.evidence.map((item: { id: string }) => item.id) } : { findings: [] });
    } };
    const handler = createResearchHandler({ reader: () => reader, model, reviewer, collection: () => ({ search: async query => record(query), searchSecondary: async query => record(query), searchWeb: async query => record(query), searchCommunity: async query => record(query), discoverIdentity: () => makeSnapshot().productIdentity, journal: { retrievalRecords: [], evidence: [], diagnostics: [], httpAttempts: [] } }) });
    const result = await handler({ investigationId: randomUUID(), question: "limits and fees", confirmedIdentity: null, signal: new AbortController().signal, setStage: async () => {} });
    expect(result.kind).toBe("COMPLETE"); if (result.kind !== "COMPLETE") throw Error("Expected synthetic completion");
    const snapshot = EvidenceSnapshotSchema.parse(result.result.snapshot);
    expect(snapshot.verificationAudit!.review.status).toBe("COMPLETED");
    expect(reviewPurposes).toEqual(["v4-review-independent", "v4-review-critique"]);
    expect(fetches).toBe(1); expect(selections).toBe(2); expect(purposes).not.toContain("v4-document-reading");
    expect(purposes.indexOf("v4-claim-extraction")).toBeGreaterThan(purposes.lastIndexOf("v4-next-research-action"));
    const actions = snapshot.research!.actions;
    const verificationIndex = actions.findIndex(action => action.kind === "VERIFY");
    expect(actions.slice(verificationIndex + 1).some(action => ["SEARCH", "READ", "SELECT"].includes(action.kind))).toBe(false);
    expect(actions.filter(action => action.kind === "VERIFY")).toHaveLength(1);
    expect(snapshot.claims.map(claim => claim.verificationStatus)).toEqual(["SUPPORTED", "INSUFFICIENT"]);
    expect(result.result.answer.citations).toHaveLength(1);
    expect(result.result.answer.body).toContain("42 units");
    expect(snapshot.research!.tasks[0]!.status).toBe("PARTIAL");
    expect(snapshot.research!.actions.some(action => action.kind === "SELECT" && action.cacheHit && action.outcome === "NO_GAIN")).toBe(true);
  });
});
