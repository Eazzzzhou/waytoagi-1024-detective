import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueueTestDatabase } from "../support/database";
import { InvestigationHttpApi } from "../../src/server/http/api";
import { AcceptedInvestigationSchema, InvestigationDetailSchema, SnapshotResponseSchema } from "../../src/contracts";
import { PostgresInvestigationQueue } from "../../src/server/queue";
import { WorkerRunner } from "../../src/worker/runner";
import { investigationHandler } from "../../src/server/investigation/handler";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";
import { ApiErrorResponseSchema } from "../../src/contracts";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
let api: InvestigationHttpApi;
let queue: PostgresInvestigationQueue;
const base = "http://127.0.0.1:3000";
function request(path: string, body?: unknown, key?: string) {
  return new Request(`${base}${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: JSON.stringify(body) });
}
async function create() {
  const response = await api.create(request("/api/investigations", { question: "HTTP isolated database test only" }, randomUUID()));
  expect(response.status).toBe(202);
  return AcceptedInvestigationSchema.parse(await response.json());
}
async function detail(id: string) { return InvestigationDetailSchema.parse(await (await api.detail(request(`/api/investigations/${id}`), id)).json()); }
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
afterEach(() => vi.unstubAllEnvs());
beforeEach(async () => {
  await database.pool.query('TRUNCATE "Job", "ExecutionAttempt", "Investigation", "EvidenceSnapshot", "Answer", "Advice" CASCADE');
  api = new InvestigationHttpApi(database.db);
  queue = new PostgresInvestigationQueue(database.db, { maxAttempts: 1 });
});

describe("HTTP handlers against real PostgreSQL", () => {
  it("accepts a real submission, preserves its status/error through Worker execution and a fresh API instance", async () => {
    vi.stubEnv("MODEL_API_KEY", "");
    const { investigationId } = await create();
    expect((await detail(investigationId)).investigation.status).toBe("PENDING");
    expect(await new WorkerRunner(queue, investigationHandler, "http-real-worker", {}, () => undefined).processOne()).toBe(true);
    const fresh = new InvestigationHttpApi(database.competitor);
    const response = await fresh.detail(request(`/api/investigations/${investigationId}`), investigationId);
    const result = InvestigationDetailSchema.parse(await response.json());
    expect(result.investigation.status).toBe("SUCCEEDED");
    expect(result.investigation.error).toBeNull();
    expect(result.identityConfirmation).toBeNull();
    expect(result.retry.allowed).toBe(false);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const text = JSON.stringify(result);
    for (const privateField of ["executionToken", "leaseOwner", "requestHash", "DATABASE_URL"]) expect(text).not.toContain(privateField);
    expect(await database.db.evidenceSnapshot.count()).toBe(1);
  });

  it("returns the same ID for a duplicate key and 409 for different parameters", async () => {
    const key = randomUUID();
    const first = AcceptedInvestigationSchema.parse(await (await api.create(request("/api/investigations", { question: "First" }, key))).json());
    const second = AcceptedInvestigationSchema.parse(await (await api.create(request("/api/investigations", { question: "First" }, key))).json());
    expect(second).toEqual({ investigationId: first.investigationId, reused: true });
    expect((await api.create(request("/api/investigations", { question: "Changed" }, key))).status).toBe(409);
    expect(await database.db.investigation.count()).toBe(1);
  });

  it("rejects invalid IDs, malformed JSON, unknown fields and missing keys", async () => {
    expect((await api.detail(request("/api/investigations/bad"), "bad")).status).toBe(400);
    expect((await api.create(new Request(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
    expect((await api.create(request("/api/investigations", { question: " " }, randomUUID()))).status).toBe(400);
    expect((await api.create(request("/api/investigations", { question: "x", extra: true }, randomUUID()))).status).toBe(400);
    expect((await api.create(request("/api/investigations", { question: "x" }))).status).toBe(400);
    expect(await database.db.investigation.count()).toBe(0);
  });

  it("rejects remote hosts, cross-site calls, wrong media types and oversized bodies", async () => {
    expect((await api.create(new Request("https://public.example/api/investigations", { method: "POST" }))).status).toBe(403);
    expect((await api.create(new Request(`${base}/api/investigations`, { method: "POST", headers: { Origin: "https://evil.example" } }))).status).toBe(403);
    expect((await api.create(new Request(`${base}/api/investigations`, { method: "POST", headers: { "Sec-Fetch-Site": "cross-site" } }))).status).toBe(403);
    expect((await api.create(new Request(`${base}/api/investigations`, { method: "POST", body: "x" }))).status).toBe(415);
    expect((await api.create(new Request(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(33000) }))).status).toBe(413);
  });

  it("accepts a local Host/Origin when Next canonicalizes the internal URL to localhost", async () => {
    const response = await api.create(new Request("http://localhost:3100/api/investigations", {
      method: "POST", headers: { Host: "127.0.0.1:3100", Origin: "http://127.0.0.1:3100", "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ question: "Local origin validation test" })
    }));
    expect(response.status).toBe(202);
    expect((await api.create(new Request("http://localhost:3100/api/investigations", { method: "POST", headers: { Host: "public.example" } }))).status).toBe(403);
  });

  it("returns an explicit 404 for missing investigations and snapshots", async () => {
    const id = randomUUID();
    expect((await api.detail(request(`/api/investigations/${id}`), id)).status).toBe(404);
    expect((await api.snapshot(request(`/api/snapshots/${id}`), id)).status).toBe(404);
  });

  it("makes identity confirmation atomic: one of two competing confirmations succeeds", async () => {
    const { investigationId } = await create();
    const lease = (await queue.claim("identity-http-worker"))!;
    const identity = { name: "Test identity only", officialWebsite: null, version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION" as const, confirmationBasis: [] };
    await queue.awaitConfirmation(lease, { identity, reason: "Isolated identity confirmation test" });
    expect((await detail(investigationId)).identityConfirmation?.reason).toBe("Isolated identity confirmation test");
    const confirmed = { ...identity, officialWebsite: "https://example.com", confirmationStatus: "CONFIRMED", confirmationBasis: [{ url: "https://example.com", excerpt: "Identity fixture only", retrievedAt: new Date().toISOString(), reason: "Fixture" }] };
    const body = { identity: confirmed, expectedAttemptCount: 1 };
    const responses = await Promise.all([api.identity(request("/identity", body), investigationId), new InvestigationHttpApi(database.competitor).identity(request("/identity", body), investigationId)]);
    expect(responses.map((item) => item.status).sort()).toEqual([202, 409]);
    expect((await detail(investigationId)).investigation.status).toBe("PENDING");
    expect((await api.identity(request("/identity", body), investigationId)).status).toBe(409);
  });

  it("rejects identity confirmation while not waiting", async () => {
    const { investigationId } = await create();
    expect((await api.identity(request("/identity", { identity: {}, expectedAttemptCount: 1 }), investigationId)).status).toBe(400);
    const identity = { name: "Fixture", officialWebsite: "https://example.com", version: null, plan: null, confirmationStatus: "CONFIRMED", confirmationBasis: [{ url: "https://example.com", excerpt: "Fixture", retrievedAt: new Date().toISOString(), reason: "Fixture" }] };
    expect((await api.identity(request("/identity", { identity, expectedAttemptCount: 1 }), investigationId)).status).toBe(409);
  });

  it("resumes a real waiting job from one short clarification without asking for research evidence", async () => {
    const { investigationId } = await create();
    const lease = (await queue.claim("clarification-http-worker"))!;
    const identity = { name: "Ambiguous fixture", officialWebsite: null, version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION" as const, confirmationBasis: [] };
    await queue.awaitConfirmation(lease, { identity, reason: "指应用还是同名公司？" });
    const response = await api.identity(request("/identity", { expectedAttemptCount: 1, identity: { ...identity, confirmationStatus: "UNRESOLVED", userClarification: "应用" } }), investigationId);
    expect(response.status).toBe(202);
    const resumed = await queue.loadTask((await queue.claim("resumed-worker"))!);
    expect(resumed.confirmedIdentity?.userClarification).toBe("应用");
    expect(resumed.confirmedIdentity?.officialWebsite).toBeNull();
    expect(resumed.confirmedIdentity?.confirmationBasis).toEqual([]);
  });

  it("limits manual retry, rejects concurrent/stale requests, and retains attempts and failure counters", async () => {
    const created = await queue.enqueue({ question: "Retry HTTP test only", idempotencyKey: randomUUID() });
    const id = created.investigation!.id;
    const error = { code: "PROVIDER_FAILED", message: "Test transient failure", retryable: true };
    for (let manual = 0; manual < 2; manual++) {
      const lease = (await queue.claim("retry-http-worker"))!;
      await queue.fail(lease, error);
      const state = await detail(id);
      expect(state.investigation.status).toBe("FAILED");
      expect(state.retry.allowed).toBe(true);
      const body = { expectedAttemptCount: state.retry.expectedAttemptCount };
      const attempts = await Promise.all([api.retry(request("/retry", body), id), new InvestigationHttpApi(database.competitor).retry(request("/retry", body), id)]);
      expect(attempts.map((response) => response.status).sort()).toEqual([202, 409]);
      expect((await api.retry(request("/retry", { expectedAttemptCount: 1 }), id)).status).toBe(409);
    }
    await queue.fail((await queue.claim("final-manual-attempt"))!, error);
    expect((await detail(id)).retry.allowed).toBe(false);
    expect((await api.retry(request("/retry", { expectedAttemptCount: 3 }), id)).status).toBe(409);
    expect(await database.db.executionAttempt.count()).toBe(3);
    const job = await database.db.job.findUniqueOrThrow({ where: { investigationId: id } });
    expect(job.failureCount).toBe(3);
    expect(job.manualRetryCount).toBe(2);
  });

  it("does not manually retry a nonretryable provider configuration error", async () => {
    const { investigationId } = await create();
    await queue.fail((await queue.claim("not-configured"))!, { code: "PROVIDER_NOT_CONFIGURED", message: "Not configured", retryable: false });
    expect((await api.retry(request("/retry", { expectedAttemptCount: 1 }), investigationId)).status).toBe(409);
    expect(await database.db.executionAttempt.count()).toBe(1);
  });

  it("returns real persisted snapshot/answer JSON and rejects corrupted JSONB on read", async () => {
    const { investigationId } = await create();
    const lease = (await queue.claim("snapshot-http-worker"))!;
    const snapshot = makeSnapshot(investigationId);
    snapshot.evidence[0]!.translation = "仅供隔离测试的译文";
    const answer = makeAnswer(snapshot);
    answer.body = "<script>alert('untrusted')</script> [1]";
    await queue.complete(lease, { snapshot, answer });
    const response = await api.snapshot(request(`/api/snapshots/${snapshot.id}`), snapshot.id);
    expect(response.status).toBe(200);
    const result = SnapshotResponseSchema.parse(await response.json());
    expect(result.snapshot).toEqual(snapshot);
    expect(result.answers[0]).toEqual(answer);
    await database.db.answer.update({ where: { id: answer.id }, data: { body: { invalid: true } } });
    expect((await api.snapshot(request(`/api/snapshots/${snapshot.id}`), snapshot.id)).status).toBe(500);
  });

  it("keeps Web reads and enqueue independent of invalid Worker polling settings", async () => {
    vi.stubEnv("WORKER_HEARTBEAT_MS", "invalid-worker-setting");
    const created = await create();
    expect((await detail(created.investigationId)).investigation.status).toBe("PENDING");
  });

  it("returns a stable 503 JSON envelope when queue configuration is invalid", async () => {
    vi.stubEnv("WORKER_MAX_ATTEMPTS", "invalid-setting");
    const response = await api.create(request("/api/investigations", { question: "Invalid config acceptance fixture" }, randomUUID()));
    expect(response.status).toBe(503);
    expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("STORAGE_UNAVAILABLE");
  });

  it("returns INVALID_STORED_DATA for wrong stored quote text and mismatching snapshot columns", async () => {
    const created = await create();
    const lease = (await queue.claim("quote-http-acceptance"))!;
    const snapshot = makeSnapshot(created.investigationId);
    const answer = makeAnswer(snapshot);
    await queue.complete(lease, { snapshot, answer });
    answer.citations[0]!.quotes![0]!.originalExcerpt = "Not the saved original";
    await database.db.answer.update({ where: { id: answer.id }, data: { body: answer } });
    const response = await api.snapshot(request(`/api/snapshots/${snapshot.id}`), snapshot.id);
    expect(response.status).toBe(500);
    expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("INVALID_STORED_DATA");
    const bad = makeSnapshot(created.investigationId);
    const rowId = randomUUID();
    await database.db.evidenceSnapshot.create({ data: { id: rowId, investigationId: bad.investigationId, version: 2, parentSnapshotId: snapshot.id, contractVersion: "1.0.0", generatedAt: new Date(bad.generatedAt), body: { ...bad, version: 2, parentSnapshotId: snapshot.id } } });
    const mismatch = await api.snapshot(request(`/api/snapshots/${rowId}`), rowId);
    expect(mismatch.status).toBe(500);
    expect(ApiErrorResponseSchema.parse(await mismatch.json()).error.code).toBe("INVALID_STORED_DATA");
  });
});
