import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createRecommendationProvider } from "../../src/server/recommendation";
import { createAdviceHandler } from "../../src/worker/advice-handler";
import { createModelProvider, type ModelProvider, type ModelRequest } from "../../src/server/models";
import { AdviceRequestSchema } from "../../src/contracts";
import { makeSnapshot } from "../fixtures/snapshot";

const conditions = { useCase: "Synthetic use case", experience: null, budget: null, requirements: [] };
const config = () => ({ provider: "test-only", model: "test-only", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() });
function supported() {
  const snapshot = makeSnapshot(); snapshot.claims[0]!.verificationStatus = "SUPPORTED"; snapshot.relations[0]!.relation = "SUPPORTS"; return snapshot;
}
describe("real recommendation adapter boundaries (synthetic model only)", () => {
  it("binds a grounded result to the snapshot and real conditions, keeps original quotes and propagates signal", async () => {
    const snapshot = supported(), before = JSON.stringify(snapshot), purposes: string[] = [];
    const signal = new AbortController().signal;
    const model: ModelProvider = { config, async generate<T>(request: ModelRequest<T>) {
      expect(request.signal).toBe(signal); purposes.push(request.purpose!);
      expect(request.formatRepair).toBe(false);
      expect(request.prompt).toContain(conditions.useCase);
      expect(request.prompt).toContain(snapshot.evidence[0]!.originalExcerpt!);
      return request.outputSchema.parse(request.purpose === "advice-grounded-proposal" ? { conditionsIssue: null, paragraphs: [{ text: "Synthetic conditional advice", claimIds: [snapshot.claims[0]!.id] }] } : { checks: [{ index: 0, supported: true, reason: "Synthetic saved proof" }] });
    } };
    const request = AdviceRequestSchema.parse({ id: randomUUID(), type: "ADVICE", investigationId: snapshot.investigationId, snapshotId: snapshot.id, userConditions: conditions, status: "RUNNING", resultAdviceId: null, conditionsIssue: null, error: null, createdAt: snapshot.generatedAt, updatedAt: snapshot.generatedAt, completedAt: null });
    const result = await createAdviceHandler(createRecommendationProvider({ model }))({ request, snapshot, signal });
    expect(result.kind).toBe("COMPLETE");
    if (result.kind !== "COMPLETE") throw new Error("Test result");
    expect(result.advice.snapshotId).toBe(snapshot.id);
    expect(result.advice.userConditions).toEqual(conditions);
    expect(result.advice.content).toContain(snapshot.evidence[0]!.sourceUrl);
    expect(result.advice.content).toContain(snapshot.evidence[0]!.originalExcerpt!);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(purposes).toEqual(["advice-grounded-proposal", "advice-evidence-check"]);
  });
  it("returns semantic condition insufficiency separately without inventing Advice", async () => {
    const issue = { message: "Synthetic deployment choice missing", missingConditions: ["Deployment constraints"] };
    let calls = 0;
    const model: ModelProvider = { config, async generate<T>(request: ModelRequest<T>) { calls++; return request.outputSchema.parse({ conditionsIssue: issue, paragraphs: [] }); } };
    const provider = createRecommendationProvider({ model });
    expect(await provider.execute(supported(), conditions)).toEqual({ kind: "INSUFFICIENT_CONDITIONS", issue });
    expect(calls).toBe(1);
    await expect(provider.generate(supported(), conditions)).rejects.toMatchObject({ detail: { code: "INVALID_INPUT" } });
  });
  it.each(["absent-claim", "unsupported", "missing-check", "duplicate-check"]) ("rejects unsafe generation: %s", async mode => {
    const snapshot = supported();
    const model: ModelProvider = { config, async generate<T>(request: ModelRequest<T>) {
      if (request.purpose === "advice-grounded-proposal") return request.outputSchema.parse({ conditionsIssue: null, paragraphs: [{ text: "Synthetic", claimIds: [mode === "absent-claim" ? randomUUID() : snapshot.claims[0]!.id] }] });
      const check = { index: 0, supported: mode !== "unsupported", reason: "Synthetic check" };
      return request.outputSchema.parse({ checks: mode === "missing-check" ? [] : mode === "duplicate-check" ? [check, check] : [check] });
    } };
    await expect(createRecommendationProvider({ model }).execute(snapshot, conditions)).rejects.toMatchObject({ detail: { code: "PROVIDER_FAILED", retryable: false } });
  });
  it("fails missing config and no-evidence snapshots, and cancellation reaches model HTTP", async () => {
    await expect(createRecommendationProvider({ env: {} }).execute(supported(), conditions)).rejects.toMatchObject({ detail: { code: "PROVIDER_NOT_CONFIGURED" } });
    const noCalls: ModelProvider = { config, generate: async () => { throw new Error("Must not call"); } };
    await expect(createRecommendationProvider({ model: noCalls }).execute(makeSnapshot(), conditions)).rejects.toMatchObject({ detail: { code: "INVALID_INPUT" } });
    const controller = new AbortController();
    let observed: AbortSignal | undefined;
    let began!: () => void;
    const started = new Promise<void>(resolve => { began = resolve; });
    const fakeFetch: typeof fetch = async (_url, init) => {
      observed = init?.signal ?? undefined; began();
      return new Promise((_resolve, reject) => { observed!.addEventListener("abort", () => reject(observed!.reason), { once: true }); });
    };
    const provider = createRecommendationProvider({ model: createModelProvider({ env: { MODEL_BASE_URL: "https://model.example/v1", MODEL_API_KEY: "synthetic-key", MODEL_NAME: "synthetic-model" }, fetch: fakeFetch }) });
    const pending = provider.execute(supported(), conditions, { signal: controller.signal });
    const rejected = expect(pending).rejects.toThrow("Synthetic stop");
    await started; controller.abort(new Error("Synthetic stop")); await rejected;
    expect(observed?.aborted).toBe(true);
  });
});
