import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "../../src/generated/prisma/client";
import { createQueueTestDatabase } from "../support/database";
import { InvestigationRepository } from "../../src/server/storage/repository";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

// Missing DB is a failure, never a silent skip. Each test rolls back its fixture writes.
let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });
async function rollbackTest(run: (tx: Prisma.TransactionClient, repo: InvestigationRepository) => Promise<void>) {
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  try {
    await database.db.$transaction(async (tx) => { await run(tx, new InvestigationRepository(tx)); throw rollback; }, { timeout: 10000 });
  } catch (error) { if (error !== rollback) throw error; }
}

describe("real PostgreSQL storage", () => {
  it("writes and reads investigation, JSONB snapshot and cited answer", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture database round trip?" });
    expect(await repo.findInvestigation(investigation.id)).toEqual(investigation);
    const snapshot = makeSnapshot(investigation.id);
    expect(await repo.createSnapshot(snapshot)).toEqual(snapshot);
    expect(await repo.findSnapshot(snapshot.id)).toEqual(snapshot);
    const answer = makeAnswer(snapshot);
    await repo.createAnswer(answer);
    expect(await repo.findAnswer(answer.id)).toEqual(answer);
    await tx.investigation.update({ where: { id: investigation.id }, data: { status: "SUCCEEDED", stage: "COMPLETED", completedAt: new Date(), resultSnapshotId: snapshot.id } });
    expect((await repo.findInvestigation(investigation.id))?.status).toBe("SUCCEEDED");
  }));
  it("rejects invalid input before writing", () => rollbackTest(async (tx, repo) => {
    await expect(repo.createInvestigation({ question: " " })).rejects.toThrow();
    await expect(repo.createSnapshot({ id: randomUUID() })).rejects.toThrow();
    expect(await tx.investigation.count()).toBe(0);
  }));
  it("revalidates malformed JSONB on read", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture corrupt JSON?" });
    const id = randomUUID();
    await tx.evidenceSnapshot.create({ data: { id, investigationId: investigation.id, version: 1, contractVersion: "1.0.0", generatedAt: new Date(), body: { invalid: true } } });
    await expect(repo.findSnapshot(id)).rejects.toThrow();
  }));
  it("creates a new snapshot version with an immutable parent", () => rollbackTest(async (_tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture version?" });
    const first = await repo.createSnapshot(makeSnapshot(investigation.id));
    const next = { ...first, id: randomUUID(), version: 2, parentSnapshotId: first.id };
    expect(await repo.createSnapshot(next)).toEqual(next);
    expect(await repo.findSnapshot(first.id)).toEqual(first);
    await expect(repo.createSnapshot({ ...next, id: randomUUID(), version: 3 })).rejects.toThrow("preceding version");
  }));
  it("enforces unique snapshot versions", () => rollbackTest(async (_tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture unique version?" });
    const snapshot = makeSnapshot(investigation.id);
    await repo.createSnapshot(snapshot);
    await expect(repo.createSnapshot({ ...snapshot, id: randomUUID() })).rejects.toThrow();
  }));
  it.each(["update", "delete"] as const)("database rejects snapshot %s", (operation) => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture immutable?" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const action = operation === "update" ? tx.evidenceSnapshot.update({ where: { id: snapshot.id }, data: { body: {} } }) : tx.evidenceSnapshot.delete({ where: { id: snapshot.id } });
    await expect(action).rejects.toThrow("immutable");
  }));
  it("prevents investigation from pointing at another investigation's snapshot", () => rollbackTest(async (tx, repo) => {
    const a = await repo.createInvestigation({ question: "Fixture A?" });
    const b = await repo.createInvestigation({ question: "Fixture B?" });
    const snapshot = await repo.createSnapshot(makeSnapshot(a.id));
    await expect(tx.investigation.update({ where: { id: b.id }, data: { resultSnapshotId: snapshot.id } })).rejects.toThrow();
  }));
  it("rejects dangling citations before writing an answer", () => rollbackTest(async (_tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture citation?" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const answer = makeAnswer(snapshot);
    answer.citations[0]!.evidenceIds = [randomUUID()];
    await expect(repo.createAnswer(answer)).rejects.toThrow("citation");
  }));
  it("revalidates malformed answer JSONB", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture bad answer?" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const id = randomUUID();
    await tx.answer.create({ data: { id, snapshotId: snapshot.id, generatedAt: new Date(), body: {} } });
    await expect(repo.findAnswer(id)).rejects.toThrow();
  }));
  it("enforces job idempotency keys", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture queue model?" });
    const data = { investigationId: investigation.id, idempotencyKey: randomUUID(), requestHash: "a".repeat(64) };
    await tx.job.create({ data });
    await expect(tx.job.create({ data })).rejects.toThrow();
  }));
  it("requires a lease for RUNNING jobs", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Fixture invalid lease?" });
    await expect(tx.job.create({ data: { investigationId: investigation.id, idempotencyKey: randomUUID(), requestHash: "a".repeat(64), status: "RUNNING" } })).rejects.toThrow();
  }));

  it("rejects malformed snapshot structure before any snapshot row is inserted", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Invalid structure acceptance fixture" });
    await expect(repo.createSnapshot({ ...makeSnapshot(investigation.id), evidence: [{}] })).rejects.toThrow();
    expect(await tx.evidenceSnapshot.count()).toBe(0);
  }));

  it("requires evidence IDs to exist even when the quote ID mapping is structurally valid", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Dangling reference acceptance fixture" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const answer = makeAnswer(snapshot);
    const missingId = randomUUID();
    answer.citations[0]!.evidenceIds = [missingId];
    answer.citations[0]!.quotes![0]!.evidenceId = missingId;
    await expect(repo.createAnswer(answer)).rejects.toThrow("readable original evidence");
    expect(await tx.answer.count()).toBe(0);
  }));

  it("rejects an altered quote and a translation presented as an original quote", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Exact quote acceptance fixture" });
    const snapshot = makeSnapshot(investigation.id);
    snapshot.evidence[0]!.translation = "测试译文，不是原句";
    await repo.createSnapshot(snapshot);
    const answer = makeAnswer(snapshot);
    for (const quote of ["Changed original sentence", snapshot.evidence[0]!.translation, `${snapshot.evidence[0]!.originalExcerpt} `]) {
      answer.citations[0]!.quotes![0]!.originalExcerpt = quote;
      await expect(repo.createAnswer(answer)).rejects.toThrow("exactly match");
    }
    expect(await tx.answer.count()).toBe(0);
  }));

  it("requires explicit quotes for new writes, while reading legacy v1 answers without mutating them", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Legacy compatibility acceptance fixture" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const legacy = makeAnswer(snapshot);
    delete legacy.citations[0]!.quotes;
    await expect(repo.createAnswer(legacy)).rejects.toThrow("requires explicit original quotes");
    await tx.answer.create({ data: { id: legacy.id, snapshotId: snapshot.id, body: legacy, generatedAt: new Date(legacy.generationConfig.generatedAt) } });
    expect(await repo.findAnswer(legacy.id)).toEqual(legacy);
    expect((await tx.answer.findUniqueOrThrow({ where: { id: legacy.id } })).body).toEqual(legacy);
  }));

  it("rejects mismatching quote text reloaded from JSONB", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Corrupt quote acceptance fixture" });
    const snapshot = await repo.createSnapshot(makeSnapshot(investigation.id));
    const answer = makeAnswer(snapshot);
    await repo.createAnswer(answer);
    answer.citations[0]!.quotes![0]!.originalExcerpt = "Corrupted quote";
    await tx.answer.update({ where: { id: answer.id }, data: { body: answer } });
    await expect(repo.findAnswer(answer.id)).rejects.toThrow("exactly match");
  }));
});
