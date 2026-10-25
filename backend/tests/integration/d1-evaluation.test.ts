import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "../../src/generated/prisma/client";
import { createQueueTestDatabase } from "../support/database";
import { InvestigationRepository } from "../../src/server/storage/repository";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";
import { evaluateSnapshot } from "../../scripts/d1/rules";

let database: Awaited<ReturnType<typeof createQueueTestDatabase>>;
beforeAll(async () => { database = await createQueueTestDatabase(); });
afterAll(async () => { await database?.close(); });

async function rollbackTest(run: (tx: Prisma.TransactionClient, repo: InvestigationRepository) => Promise<void>) {
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  try {
    await database.db.$transaction(async (tx) => { await run(tx, new InvestigationRepository(tx)); throw rollback; }, { timeout: 10000 });
  } catch (error) { if (error !== rollback) throw error; }
}

describe("D1 read-only snapshot evaluation", () => {
  it("reads an existing investigation/snapshot/answer through the repository and never writes", () => rollbackTest(async (tx, repo) => {
    const investigation = await repo.createInvestigation({ question: "Synthetic D1 read-only integration?" });
    const snapshot = makeSnapshot(investigation.id);
    snapshot.evidence[0]!.metadata = {
      ...snapshot.evidence[0]!.metadata,
      title: "Synthetic integration source",
      siteName: "example.com",
      sourceType: "THIRD_PARTY",
      contentKind: "FACT",
      independence: "INDEPENDENT",
      independenceReason: "Synthetic integration fixture, one source"
    };
    await repo.createSnapshot(snapshot);
    const answer = makeAnswer(snapshot);
    await repo.createAnswer(answer);
    await tx.investigation.update({ where: { id: investigation.id }, data: { status: "SUCCEEDED", stage: "COMPLETED", completedAt: new Date(), resultSnapshotId: snapshot.id } });

    const loadedInvestigation = await repo.findInvestigation(investigation.id);
    const loadedSnapshot = await repo.findSnapshot(snapshot.id);
    const loadedAnswer = await repo.findAnswer(answer.id);
    if (!loadedInvestigation || !loadedSnapshot || !loadedAnswer) throw new Error("Synthetic integration fixture could not be read");

    const before = {
      investigations: await tx.investigation.count(),
      snapshots: await tx.evidenceSnapshot.count(),
      answers: await tx.answer.count()
    };
    const result = evaluateSnapshot({
      caseId: "A-01", caseType: "A", intent: "objective",
      investigation: loadedInvestigation, snapshot: loadedSnapshot, answers: [loadedAnswer],
      adviceCount: 0, parentSnapshot: null
    });
    const after = {
      investigations: await tx.investigation.count(),
      snapshots: await tx.evidenceSnapshot.count(),
      answers: await tx.answer.count()
    };

    expect(result.verdict).toBe("PASS");
    expect(after).toEqual(before);
  }));
});
