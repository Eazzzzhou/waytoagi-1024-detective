import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createModelProvider, type ModelProvider, type ModelRequest } from "../../src/server/models";
import { createVerificationProviders, groupOrigins, validateAnalysis } from "../../src/server/verification";
import { createInvestigationHandler } from "../../src/server/investigation/handler";
import { createCollectionProviders } from "../../src/server/retrieval";
import type { GenerationConfig } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

const config: GenerationConfig = { provider: "synthetic-model.test", model: "test-only", promptVersion: "test", temperature: null, generatedAt: "2026-10-25T00:00:00Z" };
function scriptedModel(values: unknown[], requests: ModelRequest<unknown>[] = [], name = "test-only"): ModelProvider {
  return { config: () => ({ ...config, model: name }), async generate<T>(request: ModelRequest<T>) { requests.push(request); return request.outputSchema.parse(values.shift()); } };
}
function supportedSnapshot() {
  const snapshot = makeSnapshot();
  snapshot.claims[0]!.verificationStatus = "SUPPORTED";
  snapshot.claims[0]!.verificationReason = "Synthetic support only.";
  snapshot.relations[0]!.relation = "SUPPORTS";
  return snapshot;
}
const analysis = (snapshot: ReturnType<typeof makeSnapshot>) => ({ claims: snapshot.claims, relations: snapshot.relations, conflicts: snapshot.conflicts, gaps: snapshot.gaps });

describe("A2 synthetic boundary regressions (not real investigation acceptance)", () => {
  it("validates compatible API JSON locally and records actual response model/usage", async () => {
    const calls: unknown[] = [];
    let requestBody = "";
    const model = createModelProvider({ env: { MODEL_BASE_URL: "https://api.test/v1", MODEL_API_KEY: "test-secret", MODEL_NAME: "alias", MODEL_THINKING: "disabled" }, onCall: call => calls.push(call),
      fetch: async (_url, init) => { requestBody = String(init?.body); return Response.json({ model: "resolved-version", choices: [{ finish_reason: "stop", message: { content: '{"value":42}' } }], usage: { prompt_tokens: 10, completion_tokens: 4 } }); } });
    expect(await model.generate({ purpose: "test", prompt: "JSON test", outputSchema: z.strictObject({ value: z.number() }) })).toEqual({ value: 42 });
    expect(JSON.parse(requestBody).response_format).toEqual({ type: "json_object" });
    expect(JSON.parse(requestBody).thinking).toEqual({ type: "disabled" });
    expect(calls[0]).toMatchObject({ model: "resolved-version", thinkingMode: "DISABLED", inputTokens: 10, outcome: "SUCCEEDED" });
    expect(JSON.stringify(calls)).not.toContain("test-secret");
  });
  it.each([
    { finish_reason: "length", message: { content: '{"value":42}' } },
    { finish_reason: "stop", message: { content: '{"value":"wrong"}' } },
    { finish_reason: "stop", message: { content: "" } },
    { finish_reason: "stop", message: { content: "{}", refusal: "refused" } }
  ])("rejects incomplete/refused/schema-invalid model output %#", async choice => {
    const model = createModelProvider({ env: { MODEL_BASE_URL: "https://api.test", MODEL_API_KEY: "hidden", MODEL_NAME: "test" }, fetch: async () => Response.json({ choices: [choice] }) });
    await expect(model.generate({ prompt: "test", outputSchema: z.strictObject({ value: z.number() }) })).rejects.toMatchObject({ detail: { code: "PROVIDER_FAILED" } });
  });
  it("propagates parent cancellation before network access", async () => {
    const controller = new AbortController(); controller.abort(new Error("test cancellation"));
    await expect(createModelProvider({ env: {} }).generate({ prompt: "test", outputSchema: z.object({}), signal: controller.signal })).rejects.toThrow("test cancellation");
  });
  it("allows one schema repair and records both the failed and successful actual calls", async () => {
    let requests = 0;
    const calls: { outcome: string; purpose: string }[] = [];
    const model = createModelProvider({ env: { MODEL_BASE_URL: "https://api.test", MODEL_API_KEY: "hidden", MODEL_NAME: "test" }, onCall: call => calls.push(call),
      fetch: async () => Response.json({ choices: [{ finish_reason: "stop", message: { content: ++requests === 1 ? '{"value":42,"unexpected":true}' : '{"value":42}' } }] }) });
    expect(await model.generate({ prompt: "JSON test", purpose: "test", outputSchema: z.strictObject({ value: z.number() }) })).toEqual({ value: 42 });
    expect(requests).toBe(2);
    expect(calls).toContainEqual(expect.objectContaining({ outcome: "FAILED", purpose: "test" }));
    expect(calls).toContainEqual(expect.objectContaining({ outcome: "SUCCEEDED", purpose: "test:format-repair" }));
  });
  it("groups known upstream chains, but never counts differing domains as independent", () => {
    const first = makeSnapshot().evidence[0]!;
    const second = { ...structuredClone(first), id: randomUUID(), sourceUrl: "https://mirror.example/a", metadata: { ...first.metadata, upstreamUrl: first.sourceUrl } };
    const third = { ...structuredClone(first), id: randomUUID(), sourceUrl: "https://other.example/a" };
    const result = groupOrigins([first, second, third]);
    expect(result[0]!.metadata.independence).toBe("SHARED_ORIGIN");
    expect(result[0]!.metadata.originGroupId).toBe(result[1]!.metadata.originGroupId);
    expect(result[2]!.metadata.independence).toBe("UNKNOWN");
    const wwwAlias = { ...structuredClone(first), id: randomUUID(), sourceUrl: "https://www.example.com/test-fixture" };
    expect(groupOrigins([first, wwwAlias])[1]!.metadata.independence).toBe("SHARED_ORIGIN");
  });
  it("rejects unread support and conflicts without opposing relations", () => {
    const snapshot = supportedSnapshot();
    const unread = structuredClone(snapshot);
    Object.assign(unread.evidence[0]!, { readStatus: "FAILED", originalExcerpt: null, originalLocation: null, contentHash: null, readError: "test HTTP 403" });
    expect(() => validateAnalysis(unread, analysis(unread))).toThrow();
    const other = { ...structuredClone(snapshot.evidence[0]!), id: randomUUID(), sourceUrl: "https://other.test/article" };
    snapshot.evidence.push(other);
    snapshot.conflicts.push({ id: randomUUID(), claimIds: [snapshot.claims[0]!.id], evidenceIds: snapshot.evidence.map(item => item.id), description: "Synthetic condition difference", resolution: null });
    expect(() => validateAnalysis(snapshot, analysis(snapshot))).toThrow("opposing relations");
  });
  it("repairs an invalid evidence analysis once without weakening validation", async () => {
    const snapshot = supportedSnapshot();
    const requests: ModelRequest<unknown>[] = [];
    const invalid = { ...analysis(snapshot), relations: [] };
    const providers = createVerificationProviders({ model: scriptedModel([invalid, analysis(snapshot)], requests), env: {} });
    const output = await providers.verification.verify(snapshot);
    expect(output.claims[0]!.verificationStatus).toBe("SUPPORTED");
    expect(requests.map(request => request.purpose)).toEqual(["claim-evidence-verification", "claim-evidence-verification:validation-repair"]);
    expect(requests[1]!.prompt).toContain("不能为了通过校验而编造支持关系");
    await expect(createVerificationProviders({ model: scriptedModel([invalid, invalid]), env: {} }).verification.verify(snapshot)).rejects.toThrow("supported claim has no support");
  });
  it("preserves evidence-backed unresolved conflict, unknowns and source read failures", () => {
    const snapshot = supportedSnapshot();
    const other = { ...structuredClone(snapshot.evidence[0]!), id: randomUUID(), sourceUrl: "https://other.test/article" };
    snapshot.evidence.push(other);
    snapshot.claims[0]!.verificationStatus = "DISPUTED";
    snapshot.relations.push({ claimId: snapshot.claims[0]!.id, evidenceId: other.id, relation: "REFUTES", reason: "Synthetic same-scope opposite statement" });
    snapshot.conflicts.push({ id: randomUUID(), claimIds: [snapshot.claims[0]!.id], evidenceIds: snapshot.evidence.map(item => item.id), description: "Synthetic actual opposition", resolution: null });
    snapshot.gaps.push({ id: randomUUID(), claimIds: [], kind: "READ_FAILED", description: "Original failed to read", searchScope: null });
    const candidate = { ...analysis(snapshot), gaps: [] };
    const result = validateAnalysis(snapshot, candidate);
    expect(result.conflicts[0]!.resolution).toBeNull();
    expect(result.gaps).toHaveLength(1);
  });
  it("removes a citation whose IDs/quote match but whose prose fails semantic support", async () => {
    const snapshot = supportedSnapshot();
    snapshot.claims[0]!.statement = "An unsupported universal promise";
    snapshot.evidence[0]!.originalLocation!.context = "UNQUOTED_OSI_EXPLANATION";
    const requests: ModelRequest<unknown>[] = [];
    const model = scriptedModel([
      { claimIds: [snapshot.claims[0]!.id] },
      { checks: [{ index: 0, supported: false, reason: "The original only reports one synthetic case." }] }
    ], requests);
    const providers = createVerificationProviders({ model, env: {} });
    const answer = await providers.answer.generate(snapshot);
    expect(answer.citations).toHaveLength(0);
    expect(answer.body).toContain("尚不能确定：An unsupported universal promise");
    expect(answer.body).not.toContain("An unsupported universal promise [1]");
    expect(snapshot.gaps[0]!.description).toContain("原句语义支持核查");
    expect(snapshot.verificationAudit!.citationChecks[0]!.supported).toBe(false);
    expect(snapshot.claims[0]!.verificationStatus).toBe("INSUFFICIENT");
    expect(snapshot.relations[0]!.relation).toBe("UNCERTAIN");
    expect(requests.every(request => !request.prompt.includes("UNQUOTED_OSI_EXPLANATION"))).toBe(true);
  });
  it("completes an all-insufficient investigation honestly without asking the model to invent prose", async () => {
    const snapshot = supportedSnapshot();
    snapshot.claims[0]!.verificationStatus = "INSUFFICIENT";
    snapshot.claims[0]!.verificationReason = "The saved original does not cover the licensing condition.";
    const requests: ModelRequest<unknown>[] = [];
    const providers = createVerificationProviders({ model: scriptedModel([], requests), env: {} });
    const answer = await providers.answer.generate(snapshot);
    expect(requests).toHaveLength(0);
    expect(answer.citations).toHaveLength(0);
    expect(answer.body).toContain("尚不能确定");
  });
  it("does not force unrelated verified background into an answer", async () => {
    const snapshot = supportedSnapshot();
    const requests: ModelRequest<unknown>[] = [];
    const providers = createVerificationProviders({ model: scriptedModel([{ claimIds: [] }], requests), env: {} });
    const answer = await providers.answer.generate(snapshot, { question: "A different question with no relevant verified claim" });
    expect(answer.citations).toEqual([]);
    expect(answer.body).toContain("不足");
    expect(requests).toHaveLength(1);
  });
  it("independently reads raw evidence before draft review and retains rejected suggestion reasons", async () => {
    const snapshot = supportedSnapshot();
    const reviewRequests: ModelRequest<unknown>[] = [];
    const reviewer = scriptedModel([
      { assessment: "Synthetic independent assessment", judgments: [{ statement: "Original synthetic finding", evidenceIds: [snapshot.evidence[0]!.id], conclusion: "Limited to synthetic test" }] },
      { findings: [{ claimId: snapshot.claims[0]!.id, evidenceIds: [snapshot.evidence[0]!.id], suggestion: "Mark independent based on domain", proposedStatement: null }] }
    ], reviewRequests, "different-test-model");
    const primary = scriptedModel([analysis(snapshot), { analysis: analysis(snapshot), decisions: [{ index: 0, accepted: false, reason: "Different domains do not establish independent origin." }] }]);
    const output = await createVerificationProviders({ model: primary, reviewer, env: {} }).verification.verify(snapshot, { question: "Synthetic question" });
    expect(reviewRequests[0]!.prompt).not.toContain(snapshot.claims[0]!.statement);
    expect(reviewRequests[1]!.prompt).toContain(snapshot.claims[0]!.statement);
    expect(output.verificationAudit!.review.findings[0]).toMatchObject({ decision: "REJECTED", reason: "Different domains do not establish independent origin." });
    expect(output.evidence[0]!.metadata.independence).toBe("UNKNOWN");
  });
  it("orchestrates the formal handler without performing its own publication", async () => {
    const snapshot = supportedSnapshot();
    const evidence = snapshot.evidence[0]!;
    const identity = { ...snapshot.productIdentity, name: "SYNTHETIC TEST", officialWebsite: evidence.sourceUrl, confirmationStatus: "CONFIRMED" as const, confirmationBasis: [{ url: evidence.sourceUrl, excerpt: evidence.originalExcerpt!, retrievedAt: evidence.retrievedAt, reason: "Synthetic basis only" }] };
    const providers = createVerificationProviders({ env: {} });
    const record = { id: randomUUID(), provider: "test-only", query: "Synthetic question", calledAt: evidence.retrievedAt, status: "SUCCEEDED" as const, error: null, returnedSources: [{ url: evidence.sourceUrl, title: null, snippet: null, adoption: "PENDING" as const, adoptionReason: null, evidenceId: null }] };
    const search = async () => structuredClone({ ...record, id: randomUUID() });
    const collection = { ...createCollectionProviders(), resolve: async () => identity, discoverIdentity: () => identity, search, searchWeb: search, searchCommunity: search, fetch: async () => structuredClone(evidence), collect: async () => ({ identity, evidence: [], retrievalRecords: [], diagnostics: [] }) };
    const stages: string[] = [];
    const decision = { query: null, entries: [], readUrls: [], reason: "Synthetic test decision", observedGap: null, basisEvidenceIds: [], basisRecordIds: [], clarification: null, discoveredIdentity: null };
    const planner = scriptedModel([
      { ...decision, action: "SEARCH", query: "Synthetic question", entries: ["yuanbao", "bing"] },
      { ...decision, action: "READ", readUrls: [evidence.sourceUrl] },
      { ...decision, action: "FINISH" }
    ]);
    const handler = createInvestigationHandler({ collection: () => collection, planner, verification: () => ({ ...providers,
      extraction: { extract: async () => structuredClone(snapshot.claims) },
      verification: { verify: async input => input }, answer: { generate: async input => makeAnswer(input) }
    }) });
    const result = await handler({ investigationId: randomUUID(), question: "Synthetic question", confirmedIdentity: null, signal: new AbortController().signal, setStage: async stage => { stages.push(stage); } });
    expect(result.kind).toBe("COMPLETE");
    if (result.kind !== "COMPLETE") throw new Error("Expected synthetic completion");
    expect(result.result.snapshot.evidence).toHaveLength(1);
    expect(result.result.answer.citations[0]!.quotes![0]!.originalExcerpt).toBe(evidence.originalExcerpt);
    expect(stages).toEqual(["IDENTITY", "RETRIEVAL", "SOURCE_FETCH", "VERIFICATION", "ANSWER"]);
  });
});
