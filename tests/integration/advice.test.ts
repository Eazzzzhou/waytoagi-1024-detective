import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AcceptedAdviceRequestSchema, AdviceRequestDetailSchema, ApiErrorResponseSchema, type Advice, type UserConditions } from "../../src/contracts";
import { AdviceRepository, InvestigationRepository } from "../../src/server/storage";
import { ResourceNotFoundError, StoredDataError } from "../../src/server/storage/errors";
import { IdempotencyConflictError, PostgresInvestigationQueue } from "../../src/server/queue";
import { InvestigationHttpApi } from "../../src/server/http/api";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";
import { createQueueTestDatabase } from "../support/database";
import type { Prisma } from "../../src/generated/prisma/client";
import { readDatabaseTime } from "../../src/server/storage/database-time";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
let repository: AdviceRepository;
let api: InvestigationHttpApi;
const conditions: UserConditions = { useCase: "Synthetic acceptance use case", experience: null, budget: null, requirements: [] };
const base = "http://127.0.0.1:3000";
const get = () => new Request(base);
// Deliberately corrupt only the field under test; host clock skew must not trigger an unrelated timestamp constraint.
async function updateRequest(input: Prisma.AdviceRequestUpdateArgs) {
  const now = await readDatabaseTime(database.db);
  return database.db.adviceRequest.update({ ...input, data: { ...input.data, updatedAt: now, ...(input.data.completedAt instanceof Date ? { completedAt: now } : {}) } });
}
const post = (body: unknown, key: string = randomUUID(), headers: Record<string, string> = {}) => new Request(base, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key, ...headers }, body: JSON.stringify(body) });
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
beforeEach(async () => {
  await database.pool.query('TRUNCATE "AdviceRequest", "Job", "ExecutionAttempt", "Investigation", "EvidenceSnapshot", "Answer", "Advice" CASCADE');
  repository = new AdviceRepository(database.db);
  api = new InvestigationHttpApi(database.db);
});

async function seed(db = database.db) {
  const queue = new PostgresInvestigationQueue(db);
  const created = await queue.enqueue({ question: "Synthetic advice source investigation", idempotencyKey: randomUUID() });
  const lease = (await queue.claim("advice-test-fixture"))!;
  const snapshot = makeSnapshot(created.investigation!.id);
  const answer = makeAnswer(snapshot);
  await queue.complete(lease, { snapshot, answer });
  return { snapshot, answer, investigationId: snapshot.investigationId, jobId: created.jobId };
}
function advice(snapshotId: string): Advice {
  return { id: randomUUID(), snapshotId, userConditions: conditions, content: "Synthetic test advice, not a real recommendation", generationConfig: { provider: "test-only", model: "test-only", promptVersion: "test", temperature: null, generatedAt: new Date().toISOString() } };
}
async function detail(investigationId: string, id: string) {
  const response = await api.adviceRequest(get(), investigationId, id);
  expect(response.status).toBe(200);
  return AdviceRequestDetailSchema.parse(await response.json());
}

describe("advice request persistence and HTTP", () => {
  it("atomically deduplicates concurrent creates without altering the investigation Job, answer or snapshot", async () => {
    const source = await seed();
    const beforeJob = await database.db.job.findUniqueOrThrow({ where: { id: source.jobId } });
    const beforeInvestigation = await database.db.investigation.findUniqueOrThrow({ where: { id: source.investigationId } });
    const key = randomUUID();
    const body = { snapshotId: source.snapshot.id, userConditions: conditions };
    const other = new InvestigationHttpApi(database.competitor);
    const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => (i % 2 ? api : other).createAdviceRequest(post(body, key), source.investigationId)));
    expect(responses.map((r) => r.status)).toEqual(Array(6).fill(202));
    const results = await Promise.all(responses.map(async (r) => AcceptedAdviceRequestSchema.parse(await r.json())));
    expect(new Set(results.map((r) => r.adviceRequestId)).size).toBe(1);
    expect(results.filter((r) => !r.reused)).toHaveLength(1);
    expect(await database.db.adviceRequest.count()).toBe(1);
    const state = await detail(source.investigationId, results[0]!.adviceRequestId);
    expect(state.request.status).toBe("PENDING");
    expect(state.advice).toBeNull();
    expect(state.request.type).toBe("ADVICE");
    for (const field of ["idempotencyKey", "requestHash", "executionToken"]) expect(JSON.stringify(state)).not.toContain(field);
    expect(await database.db.job.findUniqueOrThrow({ where: { id: source.jobId } })).toEqual(beforeJob);
    expect(await database.db.investigation.findUniqueOrThrow({ where: { id: source.investigationId } })).toEqual(beforeInvestigation);
    const old = await new InvestigationRepository(database.db).findSnapshot(source.snapshot.id);
    expect(old).toEqual(source.snapshot);
    expect(await new InvestigationRepository(database.db).findAnswer(source.answer.id)).toEqual(source.answer);
    expect(await new PostgresInvestigationQueue(database.db).claim("old-worker")).toBeNull();
    expect(await database.db.advice.count()).toBe(0);
  });

  it("separates changed conditions, scopes keys by investigation and conflicts on changed payload or snapshot", async () => {
    const a = await seed();
    const body = { snapshotId: a.snapshot.id, userConditions: conditions };
    const key = randomUUID();
    const first = await repository.createRequest(a.investigationId, body, key);
    const second = await repository.createRequest(a.investigationId, { ...body, userConditions: { ...conditions, budget: "Synthetic second budget" } }, randomUUID());
    expect(second.request.id).not.toBe(first.request.id);
    expect((await repository.createRequest(a.investigationId, { ...body, userConditions: { ...conditions, useCase: ` ${conditions.useCase} ` } }, key)).reused).toBe(true);
    expect((await api.createAdviceRequest(post({ ...body, userConditions: { ...conditions, requirements: ["Different requirement"] } }, key), a.investigationId)).status).toBe(409);
    const next = { ...a.snapshot, id: randomUUID(), version: 2, parentSnapshotId: a.snapshot.id };
    await new InvestigationRepository(database.db).createSnapshot(next);
    expect((await api.createAdviceRequest(post({ ...body, snapshotId: next.id }, key), a.investigationId)).status).toBe(409);
    const b = await seed();
    expect((await repository.createRequest(b.investigationId, { ...body, snapshotId: b.snapshot.id }, key)).reused).toBe(false);
    expect(await database.db.adviceRequest.count()).toBe(3);
  });

  it("rejects missing/cross-investigation snapshots, invalid bodies and denied access without creating tasks", async () => {
    const a = await seed();
    const b = await seed();
    const body = { snapshotId: a.snapshot.id, userConditions: conditions };
    for (const [investigationId, snapshotId] of [[b.investigationId, a.snapshot.id], [a.investigationId, randomUUID()], [randomUUID(), a.snapshot.id]]) {
      const response = await api.createAdviceRequest(post({ ...body, snapshotId }), investigationId);
      expect(response.status).toBe(404);
      expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("NOT_FOUND");
    }
    for (const bad of [{ ...body, userConditions: { ...conditions, useCase: " " } }, { ...body, snapshotId: "invalid" }, { ...body, arbitrary: true }]) expect((await api.createAdviceRequest(post(bad), a.investigationId)).status).toBe(400);
    expect((await api.createAdviceRequest(post(body, ""), a.investigationId)).status).toBe(400);
    expect((await api.createAdviceRequest(post(body, randomUUID(), { "Content-Type": "text/plain" }), a.investigationId)).status).toBe(415);
    expect((await api.createAdviceRequest(post(body, randomUUID(), { Origin: "https://attacker.example" }), a.investigationId)).status).toBe(403);
    const denied = new InvestigationHttpApi(database.db, () => false);
    expect((await denied.createAdviceRequest(post(body), a.investigationId)).status).toBe(403);
    expect((await denied.adviceRequest(get(), a.investigationId, randomUUID())).status).toBe(403);
    expect(await database.db.adviceRequest.count()).toBe(0);
    const created = await repository.createRequest(a.investigationId, body, randomUUID());
    expect((await api.adviceRequest(get(), b.investigationId, created.request.id)).status).toBe(404);
    expect((await api.adviceRequest(get(), a.investigationId, randomUUID())).status).toBe(404);
    expect((await api.adviceRequest(get(), a.investigationId, "invalid")).status).toBe(400);
    expect((await denied.adviceRequest(get(), a.investigationId, created.request.id)).status).toBe(403);
  });

  it("allows only one payload to win a concurrent idempotency conflict", async () => {
    const source = await seed();
    const key = randomUUID();
    const responses = await Promise.all([conditions, { ...conditions, budget: "Different concurrent budget" }].map((userConditions) => api.createAdviceRequest(post({ snapshotId: source.snapshot.id, userConditions }, key), source.investigationId)));
    expect(responses.map((r) => r.status).sort()).toEqual([202, 409]);
    expect(await database.db.adviceRequest.count()).toBe(1);
  });

  it("round-trips validated Advice and rejects invalid writes, missing/cross-scope references and conflicting repeats", async () => {
    const source = await seed();
    const result = advice(source.snapshot.id);
    const other = new AdviceRepository(database.competitor);
    expect(await Promise.all([repository.createAdvice(source.investigationId, result), other.createAdvice(source.investigationId, result)])).toEqual([result, result]);
    expect(await database.db.advice.count()).toBe(1);
    await expect(repository.createAdvice(source.investigationId, { ...result, content: "Changed result" })).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await repository.findAdvice(source.investigationId, result.id)).toEqual(result);
    await expect(repository.createAdvice(source.investigationId, { ...result, id: randomUUID(), userConditions: {} })).rejects.toThrow();
    await expect(repository.createAdvice(source.investigationId, { ...result, id: randomUUID(), snapshotId: randomUUID() })).rejects.toBeInstanceOf(ResourceNotFoundError);
    const otherSource = await seed();
    await expect(repository.createAdvice(otherSource.investigationId, { ...result, id: randomUUID() })).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(repository.findAdvice(otherSource.investigationId, result.id)).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(await database.db.advice.count()).toBe(1);
  });

  it("queries persisted success, conditions insufficiency and failures without treating missing conditions as a system failure", async () => {
    const source = await seed();
    const create = () => repository.createRequest(source.investigationId, { snapshotId: source.snapshot.id, userConditions: conditions }, randomUUID());
    const success = await create();
    const result = await repository.createAdviceForRequest(source.investigationId, success.request.id, advice(source.snapshot.id));
    await expect(repository.createAdviceForRequest(source.investigationId, success.request.id, { ...result, id: randomUUID(), userConditions: { ...conditions, budget: "Wrong request conditions" } })).rejects.toBeInstanceOf(IdempotencyConflictError);
    await expect(repository.createAdviceForRequest(source.investigationId, success.request.id, { ...result, id: randomUUID(), snapshotId: randomUUID() })).rejects.toBeInstanceOf(IdempotencyConflictError);
    // Test-only state setup; production task publication belongs to the stage-4 lease transaction.
    await updateRequest({ where: { id: success.request.id }, data: { status: "SUCCEEDED", resultAdviceId: result.id, completedAt: new Date() } });
    const state = await detail(source.investigationId, success.request.id);
    expect(state.advice).toEqual(result);
    expect(state.request.status).toBe("SUCCEEDED");
    expect(await repository.createAdviceForRequest(source.investigationId, success.request.id, result)).toEqual(result);
    await expect(repository.createAdviceForRequest(source.investigationId, success.request.id, { ...result, id: randomUUID() })).rejects.toBeInstanceOf(IdempotencyConflictError);
    const insufficient = await create();
    const conditionsIssue = { message: "Synthetic provider needs a concrete deployment requirement", missingConditions: ["Deployment requirement"] };
    await updateRequest({ where: { id: insufficient.request.id }, data: { status: "INSUFFICIENT_CONDITIONS", conditionsIssue, completedAt: new Date() } });
    const missing = await detail(source.investigationId, insufficient.request.id);
    expect(missing.request.conditionsIssue).toEqual(conditionsIssue);
    expect(missing.request.error).toBeNull();
    expect(missing.advice).toBeNull();
    const failed = await create();
    await updateRequest({ where: { id: failed.request.id }, data: { status: "FAILED", error: { code: "PROVIDER_NOT_CONFIGURED", message: "Synthetic missing provider", retryable: false }, completedAt: new Date() } });
    const failure = await detail(source.investigationId, failed.request.id);
    expect(failure.request.error?.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(failure.request.conditionsIssue).toBeNull();
    expect(failure.advice).toBeNull();
    expect(await new InvestigationRepository(database.db).findAnswer(source.answer.id)).toEqual(source.answer);
  });

  it("fails closed on damaged task JSON, hashes, results and relational metadata", async () => {
    const source = await seed();
    const created = await repository.createRequest(source.investigationId, { snapshotId: source.snapshot.id, userConditions: conditions }, randomUUID());
    await updateRequest({ where: { id: created.request.id }, data: { userConditions: {} } });
    let response = await api.adviceRequest(get(), source.investigationId, created.request.id);
    expect(response.status).toBe(500);
    expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("INVALID_STORED_DATA");
    await updateRequest({ where: { id: created.request.id }, data: { userConditions: conditions, requestHash: "0".repeat(64) } });
    expect((await api.adviceRequest(get(), source.investigationId, created.request.id)).status).toBe(500);
    const correct = await repository.createRequest(source.investigationId, { snapshotId: source.snapshot.id, userConditions: conditions }, randomUUID());
    const result = advice(source.snapshot.id);
    await repository.createAdvice(source.investigationId, result);
    await updateRequest({ where: { id: correct.request.id }, data: { status: "SUCCEEDED", resultAdviceId: result.id, completedAt: new Date() } });
    await database.db.advice.update({ where: { id: result.id }, data: { body: { ...result, userConditions: { ...conditions, budget: "Mismatched conditions" } } } });
    expect((await api.adviceRequest(get(), source.investigationId, correct.request.id)).status).toBe(500);
    await database.db.advice.update({ where: { id: result.id }, data: { body: { ...result, id: randomUUID() } } });
    await expect(repository.findAdvice(source.investigationId, result.id)).rejects.toBeInstanceOf(StoredDataError);
    await database.db.advice.update({ where: { id: result.id }, data: { body: result, generatedAt: new Date("2020-01-01T00:00:00Z") } });
    await expect(repository.findAdvice(source.investigationId, result.id)).rejects.toBeInstanceOf(StoredDataError);
    await database.db.advice.update({ where: { id: result.id }, data: { body: {} } });
    response = await api.adviceRequest(get(), source.investigationId, correct.request.id);
    expect(response.status).toBe(500);
    expect(ApiErrorResponseSchema.parse(await response.json()).error.code).toBe("INVALID_STORED_DATA");
  });

  it("database constraints reject cross-snapshot results and impossible terminal states", async () => {
    const a = await seed();
    const b = await seed();
    const request = (await repository.createRequest(a.investigationId, { snapshotId: a.snapshot.id, userConditions: conditions }, randomUUID())).request;
    const result = await repository.createAdvice(b.investigationId, advice(b.snapshot.id));
    await expect(updateRequest({ where: { id: request.id }, data: { status: "SUCCEEDED", resultAdviceId: result.id, completedAt: new Date() } })).rejects.toThrow();
    await expect(updateRequest({ where: { id: request.id }, data: { status: "SUCCEEDED", completedAt: new Date() } })).rejects.toThrow();
    await expect(updateRequest({ where: { id: request.id }, data: { status: "FAILED", completedAt: new Date() } })).rejects.toThrow();
    await expect(updateRequest({ where: { id: request.id }, data: { snapshotId: b.snapshot.id } })).rejects.toThrow();
  });
});

it("upgrades the previous migration boundary without changing legacy jobs, snapshots, answers or Advice", async () => {
  const legacy = await createQueueTestDatabase({ throughMigration: "20261025040000_research_depth_v4" });
  try {
    const source = await seed(legacy.db);
    const oldAdvice = advice(source.snapshot.id);
    await legacy.db.advice.create({ data: { id: oldAdvice.id, snapshotId: oldAdvice.snapshotId, body: oldAdvice, generatedAt: new Date(oldAdvice.generationConfig.generatedAt) } });
    const before = await Promise.all([legacy.db.job.findMany(), legacy.db.investigation.findMany(), legacy.db.evidenceSnapshot.findMany(), legacy.db.answer.findMany(), legacy.db.advice.findMany()]);
    await legacy.pool.query(await readFile("prisma/migrations/20261025050000_advice_requests/migration.sql", "utf8"));
    expect(await Promise.all([legacy.db.job.findMany(), legacy.db.investigation.findMany(), legacy.db.evidenceSnapshot.findMany(), legacy.db.answer.findMany(), legacy.db.advice.findMany()])).toEqual(before);
    await legacy.pool.query(await readFile("prisma/migrations/20261025060000_advice_execution/migration.sql", "utf8"));
    const repo = new AdviceRepository(legacy.db);
    expect(await repo.findAdvice(source.investigationId, oldAdvice.id)).toEqual(oldAdvice);
    expect((await repo.createRequest(source.investigationId, { snapshotId: source.snapshot.id, userConditions: conditions }, randomUUID())).request.status).toBe("PENDING");
  } finally { await legacy.close(); }
});
