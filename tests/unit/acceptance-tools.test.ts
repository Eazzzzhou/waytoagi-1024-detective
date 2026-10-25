import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectServices } from "../../scripts/acceptance/services";
import { captureAdvice, writeAdviceCapture } from "../../scripts/acceptance/advice-capture";
import { type AdviceRequestDetail } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

describe("offline service preflight", () => {
  const model = { MODEL_BASE_URL: "https://synthetic.example/v1", MODEL_NAME: "synthetic", MODEL_API_KEY: "secret-test-value" };
  it("lists missing configuration without assuming service availability", () => {
    const result = inspectServices({});
    expect(result.readyForAuthenticatedInvestigation).toBe(false);
    expect(result.primary.missing).toEqual(["MODEL_BASE_URL", "MODEL_NAME", "MODEL_API_KEY"]);
    expect(result.search.status).toBe("MISSING");
    expect(result.database).toBe("INVALID_OR_MISSING");
  });
  it("reports presence only, conceals values and rejects a shared reviewer identity", () => {
    const result = inspectServices({ ...model, TENCENTCLOUD_WSA_APIKEY: "search-secret", REVIEW_MODEL_BASE_URL: model.MODEL_BASE_URL, REVIEW_MODEL_NAME: model.MODEL_NAME, REVIEW_MODEL_API_KEY: "review-secret" });
    expect(result.readyForAuthenticatedInvestigation).toBe(true);
    expect(result.primary.status).toBe("CONFIGURED_NOT_VERIFIED");
    expect(result.reviewer.independentIdentity).toBe(false);
    const text = JSON.stringify(result);
    for (const value of [...Object.values(model), "search-secret", "review-secret"]) expect(text).not.toContain(value);
  });
  it("detects invalid model settings and missing files without opening credentials", () => {
    const result = inspectServices({ ...model, MODEL_TIMEOUT_MS: "bad", TENCENTCLOUD_WSA_APIKEY_FILE: "private-path", COLLECTION_BROWSER_EXECUTABLE: "private-browser" }, () => false);
    expect(result.primary.status).toBe("INVALID_CONFIG");
    expect(result.search.status).toBe("MISSING");
    expect(result.browser).toBe("EXECUTABLE_MISSING");
    expect(JSON.stringify(result)).not.toContain("private-");
    expect(inspectServices({ ...model, TENCENTCLOUD_WSA_APIKEY_FILE: "private-path" }, () => true).search.keySource).toBe("FILE_NOT_VALIDATED");
  });
});

describe("read-only persisted advice capture (synthetic HTTP only)", () => {
  function setup(statuses: AdviceRequestDetail["request"]["status"][]) {
    const snapshot = makeSnapshot(), answer = makeAnswer(snapshot), id = randomUUID(), adviceId = randomUUID();
    const userConditions = { useCase: "Synthetic capture test", experience: null, budget: null, requirements: [] };
    const options = { baseUrl: "http://127.0.0.1:3000", investigationId: snapshot.investigationId, requestId: id };
    const paths: string[] = [];
    let clock = Date.parse(snapshot.generatedAt), calls = 0;
    const fakeFetch: typeof fetch = async (url, init) => {
      expect(init?.method).toBe("GET"); expect(init?.redirect).toBe("error");
      paths.push(new URL(String(url)).pathname);
      if (paths.at(-1) === `/api/snapshots/${snapshot.id}`) {
        expect(init?.signal?.aborted).toBe(false);
        return Response.json({ snapshot, answers: [answer] });
      }
      const status = statuses[Math.min(calls++, statuses.length - 1)]!;
      const terminal = !["PENDING", "RUNNING"].includes(status);
      const detail: AdviceRequestDetail = {
        request: { id, type: "ADVICE", investigationId: snapshot.investigationId, snapshotId: snapshot.id, userConditions, status, resultAdviceId: status === "SUCCEEDED" ? adviceId : null, conditionsIssue: status === "INSUFFICIENT_CONDITIONS" ? { message: "Synthetic missing constraint", missingConditions: ["Deployment"] } : null, error: status === "FAILED" ? { code: "PROVIDER_FAILED", message: "Synthetic failure", retryable: false } : null, createdAt: snapshot.generatedAt, updatedAt: new Date(clock).toISOString(), completedAt: terminal ? new Date(clock).toISOString() : null },
        advice: status === "SUCCEEDED" ? { id: adviceId, snapshotId: snapshot.id, userConditions, content: "Synthetic advice", generationConfig: answer.generationConfig } : null
      };
      return Response.json(detail);
    };
    return { options, paths, snapshot, answer, dependencies: { fetch: fakeFetch, now: () => clock, pause: async (ms: number) => { clock += ms; } } };
  }
  it("captures state transitions and bound objective source without writing through HTTP", async () => {
    const fixture = setup(["PENDING", "RUNNING", "SUCCEEDED"]);
    const result = await captureAdvice(fixture.options, fixture.dependencies);
    expect(result.outcome).toBe("SUCCEEDED");
    expect(result.observedStates.map(s => s.status)).toEqual(["PENDING", "RUNNING", "SUCCEEDED"]);
    expect(result.source).toEqual({ snapshot: fixture.snapshot, answers: [fixture.answer] });
    expect(result.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.objectiveAnswersSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fixture.paths).toHaveLength(4);
    const folder = await mkdtemp(join(tmpdir(), "advice-capture-test-"));
    try {
      const output = join(folder, "capture.json");
      await writeAdviceCapture(output, result);
      const original = await readFile(output, "utf8");
      await expect(writeAdviceCapture(output, result)).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(output, "utf8")).toBe(original);
    } finally { await rm(folder, { recursive: true, force: true }); }
  });
  it.each(["FAILED", "INSUFFICIENT_CONDITIONS"] as const)("preserves %s without fabricating advice", async status => {
    const fixture = setup([status]);
    const result = await captureAdvice(fixture.options, fixture.dependencies);
    expect(result.outcome).toBe(status); expect(result.detail.advice).toBeNull();
  });
  it("saves a timed-out observation as active, with a separate source read budget", async () => {
    const fixture = setup(["RUNNING"]);
    const result = await captureAdvice({ ...fixture.options, timeoutMs: 10 }, fixture.dependencies);
    expect(result.outcome).toBe("OBSERVATION_TIMEOUT");
    expect(result.detail.request.status).toBe("RUNNING");
    expect(result.detail.request.error).toBeNull();
  });
  it("rejects nonlocal origins, mismatched scope and HTTP errors", async () => {
    const fixture = setup(["SUCCEEDED"]);
    await expect(captureAdvice({ ...fixture.options, baseUrl: "https://remote.example" }, fixture.dependencies)).rejects.toThrow("local");
    await expect(captureAdvice({ ...fixture.options, investigationId: randomUUID() }, fixture.dependencies)).rejects.toThrow("scope");
    await expect(captureAdvice(fixture.options, { fetch: async () => new Response("private error body", { status: 404 }) })).rejects.toThrow("Capture read HTTP 404");
  });
});
