import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Evidence, InvestigationDecision, ModelCall, RetrievalRecord } from "../../src/contracts";
import { createInvestigationHandler } from "../../src/server/investigation/handler";
import { createVerificationProviders } from "../../src/server/verification";
import type { ModelProvider, ModelRequest } from "../../src/server/models";
import { makeSnapshot } from "../fixtures/snapshot";

const blank = { query: null, entries: [], readUrls: [], reason: "Synthetic decision only", observedGap: null, basisEvidenceIds: [], basisRecordIds: [], clarification: null, discoveredIdentity: null };
const choose = (action: InvestigationDecision["action"], extra: Partial<InvestigationDecision> = {}): InvestigationDecision => ({ ...blank, action, ...extra });
function rig(decide: (input: Record<string, unknown>, call: number) => InvestigationDecision | Promise<InvestigationDecision>, options: { failedWeb?: boolean; throwingRead?: boolean; slowPlanner?: boolean } = {}) {
  const queries: string[] = [];
  const originals: Evidence[] = [];
  const requests: ModelRequest<unknown>[] = [];
  const planner: ModelProvider = { async generate<T>(request: ModelRequest<T>) {
    requests.push(request);
    const input = JSON.parse(request.prompt.split("\n").at(-1)!);
    return request.outputSchema.parse(await decide(input, requests.length));
  } };
  const identity = makeSnapshot().productIdentity;
  const search = async (query: string): Promise<RetrievalRecord> => {
    queries.push(query);
    return { id: randomUUID(), provider: "synthetic-search", query, calledAt: new Date().toISOString(), status: "SUCCEEDED", error: null,
      returnedSources: [{ url: query === "follow observed v2 gap" ? "https://example.com/v2" : "https://example.com/v1", title: "Synthetic", snippet: "Not original evidence", adoption: "PENDING", adoptionReason: null, evidenceId: null }] };
  };
  const collection = {
    resolve: async () => { throw new Error("Unknown identity must not be a prerequisite"); }, search,
    searchWeb: options.failedWeb ? async (query: string): Promise<RetrievalRecord> => ({ id: randomUUID(), provider: "synthetic-failed-web", query, calledAt: new Date().toISOString(), status: "FAILED", error: "Injected HTTP 429", returnedSources: [] }) : search,
    searchCommunity: search,
    fetch: async (url: string) => {
      if (options.throwingRead && url.endsWith("v2")) throw new Error("Injected read transport failure");
      const item = { ...makeSnapshot().evidence[0]!, sourceUrl: url, originalExcerpt: url.endsWith("v1") ? "Synthetic v1 report: v2 needs checking." : "Synthetic v2 report." };
      originals.push(item); return item;
    },
    collect: async () => ({ identity, evidence: [], retrievalRecords: [] })
  };
  const providers = createVerificationProviders({ env: {} });
  const calls: ModelCall[] = [];
  providers.audit.modelCalls = calls;
  const verification = () => ({ ...providers,
    extraction: { extract: async () => [] }, verification: { verify: async (input: ReturnType<typeof makeSnapshot>) => input },
    answer: { generate: async (input: ReturnType<typeof makeSnapshot>) => ({ id: randomUUID(), snapshotId: input.id, body: "Synthetic result: insufficient evidence.", citations: [], generationConfig: { provider: "test", model: "test", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() } }) }
  });
  return { queries, originals, requests, planner, collection: () => collection, verification };
}
const run = async (handler: ReturnType<typeof createInvestigationHandler>) => handler({ investigationId: randomUUID(), question: "Unlisted synthetic product question", confirmedIdentity: null, signal: new AbortController().signal, setStage: async () => {} });

describe("evidence-driven investigation loop (synthetic controls, not business acceptance)", () => {
  it("searches unknown identities, reads real observations, and only then changes the query", async () => {
    const test = rig((input, call) => {
      const evidence = input.evidence as Evidence[]; const records = input.retrievalRecords as RetrievalRecord[];
      if (call === 1) return choose("SEARCH", { query: "initial", entries: ["yuanbao", "bing"] });
      if (call === 2) return choose("READ", { readUrls: [records[0]!.returnedSources[0]!.url], basisRecordIds: [records[0]!.id] });
      if (call === 3) {
        expect(evidence[0]!.originalExcerpt).toContain("v2 needs checking");
        expect(test.queries).not.toContain("follow observed v2 gap");
        return choose("SEARCH", { query: "follow observed v2 gap", entries: ["yuanbao"], observedGap: "Saved v1 report does not establish v2", basisEvidenceIds: [evidence[0]!.id] });
      }
      if (call === 4) return choose("READ", { readUrls: ["https://example.com/v2"], basisRecordIds: [records.at(-1)!.id] });
      return choose("FINISH", { basisEvidenceIds: evidence.map(item => item.id) });
    });
    const result = await run(createInvestigationHandler(test));
    expect(result.kind).toBe("COMPLETE");
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(result.result.snapshot.productIdentity.confirmationStatus).toBe("UNRESOLVED");
    expect(result.result.snapshot.evidence).toHaveLength(2);
    const loop = result.result.snapshot.verificationAudit!.investigationLoop!;
    expect(loop.searchRounds).toBe(2);
    expect(loop.decisions[2]!.decision.basisEvidenceIds).toEqual([result.result.snapshot.evidence[0]!.id]);
    expect(loop.decisions[2]!.outcome).toBe("EXECUTED");
    expect(loop.collectionCalls).toHaveLength(5);
  });
  it("retains successful reads and individual search/read failures", async () => {
    const test = rig((input, call) => {
      const evidence = input.evidence as Evidence[];
      if (call === 1) return choose("SEARCH", { query: "initial", entries: ["yuanbao", "bing"] });
      if (call === 2) return choose("READ", { readUrls: ["https://example.com/v1"] });
      if (call === 3) return choose("SEARCH", { query: "follow observed v2 gap", entries: ["yuanbao"], observedGap: "Need v2", basisEvidenceIds: [evidence[0]!.id] });
      if (call === 4) return choose("READ", { readUrls: ["https://example.com/v2"] });
      return choose("FINISH");
    }, { failedWeb: true, throwingRead: true });
    const result = await run(createInvestigationHandler(test));
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(result.result.snapshot.evidence).toHaveLength(1);
    expect(result.result.snapshot.gaps.map(item => item.description).join(" ")).toContain("Injected HTTP 429");
    expect(result.result.snapshot.gaps.map(item => item.description).join(" ")).toContain("Injected read transport failure");
  });
  it("stops simple questions after one search/read round instead of spending all three", async () => {
    const test = rig((_input, call) => call === 1 ? choose("SEARCH", { query: "simple", entries: ["yuanbao"] }) : call === 2 ? choose("READ", { readUrls: ["https://example.com/v1"] }) : choose("FINISH", { reason: "Saved original covers the simple question" }));
    const result = await run(createInvestigationHandler(test));
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(result.result.snapshot.verificationAudit!.investigationLoop!.searchRounds).toBe(1);
    expect(test.requests).toHaveLength(3);
  });
  it("rejects fabricated decision evidence and never executes an unobserved URL", async () => {
    const test = rig((_input, call) => call === 1 ? choose("SEARCH", { query: "initial", entries: ["yuanbao"] }) : call === 2 ? choose("SEARCH", { query: "fabricated", entries: ["yuanbao"], observedGap: "fake gap", basisEvidenceIds: [randomUUID()] }) : call === 3 ? choose("READ", { readUrls: ["https://unobserved.example/"] }) : choose("FINISH"));
    const result = await run(createInvestigationHandler(test));
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(test.queries).toEqual(["initial"]);
    expect(test.originals).toHaveLength(0);
    expect(result.result.snapshot.verificationAudit!.investigationLoop!.decisions[1]!.outcome).toBe("REJECTED");
  });
  it("enforces the search-round ceiling even when the model asks for more", async () => {
    const test = rig((input, call) => call <= 5 ? choose("SEARCH", { query: `query-${call}`, entries: ["yuanbao"], observedGap: call > 1 ? "Search did not establish the required version" : null, basisRecordIds: (input.retrievalRecords as RetrievalRecord[]).map(record => record.id) }) : choose("FINISH"));
    const result = await run(createInvestigationHandler(test));
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(test.queries).toHaveLength(3);
    expect(result.result.snapshot.verificationAudit!.investigationLoop!.searchRounds).toBe(3);
  });
  it("bounds a provider ignoring cancellation and preserves earlier evidence", async () => {
    const test = rig((_input, call) => call === 1 ? choose("SEARCH", { query: "initial", entries: ["yuanbao"] }) : call === 2 ? choose("READ", { readUrls: ["https://example.com/v1"] }) : new Promise(() => {}));
    const result = await run(createInvestigationHandler({ ...test, totalBudgetMs: 1300, answerReserveMs: 100 }));
    if (result.kind !== "COMPLETE") throw new Error("Expected completion");
    expect(result.result.snapshot.evidence).toHaveLength(1);
    expect(result.result.snapshot.verificationAudit!.investigationLoop!.durationMs).toBeLessThan(1500);
    expect(result.result.snapshot.gaps.map(item => item.description).join(" ")).toContain("budget");
  });
  it("asks one intent question only after an actual ambiguous search result", async () => {
    const test = rig((input, call) => call === 1 ? choose("SEARCH", { query: "ambiguous", entries: ["yuanbao"] }) : choose("CLARIFY", { clarification: "你指的是应用还是同名公司？", observedGap: "Search returned two meanings that change the answer", basisRecordIds: [(input.retrievalRecords as RetrievalRecord[])[0]!.id] }));
    const result = await run(createInvestigationHandler(test));
    expect(result.kind).toBe("AWAITING_CONFIRMATION");
    if (result.kind !== "AWAITING_CONFIRMATION") throw new Error("Expected clarification");
    expect(result.request.reason).toBe("你指的是应用还是同名公司？");
    expect(result.request.identity.officialWebsite).toBeNull();
  });
});
