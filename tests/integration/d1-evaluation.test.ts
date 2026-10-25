import "dotenv/config";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "../../src/generated/prisma/client";
import { createQueueTestDatabase } from "../support/database";
import { InvestigationRepository } from "../../src/server/storage/repository";
import { readDatabaseTime } from "../../src/server/storage/database-time";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";
import { D1RunRecordSchema, evaluateSnapshot } from "../../scripts/d1/rules";
import { loadCaseRecord } from "../../scripts/d1/case";

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
  it("records database-verified failure via CLI, preserves bytes on duplicates and rejects false failures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "d1-cli-failure-"));
    const script = resolve("scripts/d1/evaluate.ts");
    const loader = pathToFileURL(resolve("node_modules/tsx/dist/loader.mjs")).href;
    const caseRecord = await loadCaseRecord("A-01");
    const repo = new InvestigationRepository(database.db);
    const investigation = await repo.createInvestigation({ question: caseRecord.question });
    const cli = (flags: string[], databaseUrl = database.connectionString) => spawnSync(process.execPath, ["--import", loader, script, "--case", "A-01", ...flags], {
      cwd: directory, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8", timeout: 10000, windowsHide: true
    });
    try {
      await mkdir(join(directory, "cases/A/A-01"), { recursive: true });
      for (const name of ["case.md", "reference.md"]) await copyFile(join("cases/A/A-01", name), join(directory, "cases/A/A-01", name));
      const evidence = join(directory, "status.json");
      const failureFlags = ["--failed", "--investigation", investigation.id, "--reason", "Synthetic integration failure", "--evidence", evidence, "--run-id", "failed-cli-test"];
      await writeFile(evidence, "test-only state evidence");
      expect(cli(failureFlags).status).toBe(1); // PENDING cannot masquerade as FAILED.
      await database.db.investigation.update({ where: { id: investigation.id }, data: {
        status: "FAILED", stage: "IDENTITY", completedAt: await readDatabaseTime(database.db), updatedAt: await readDatabaseTime(database.db),
        error: { code: "PROVIDER_NOT_CONFIGURED", message: "Synthetic integration failure", retryable: false }
      } });
      const before = await database.db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
      await writeFile(evidence, JSON.stringify(before));
      const result = cli(failureFlags);
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(2);
      const path = join(directory, "cases/runs/A-01/failed-cli-test.json");
      const bytes = await readFile(path, "utf8");
      const record = D1RunRecordSchema.parse(JSON.parse(bytes));
      expect(record.execution).toBe("FAILED");
      expect(record.failure?.investigation.error?.code).toBe("PROVIDER_NOT_CONFIGURED");
      expect(record.failure?.investigation.stage).toBe("IDENTITY");
      expect(record.system.snapshotId).toBeNull();
      expect(record.snapshot).toBeNull();
      expect(cli(failureFlags).status).toBe(1);
      expect(await readFile(path, "utf8")).toBe(bytes);
      expect(await database.db.investigation.findUniqueOrThrow({ where: { id: investigation.id } })).toEqual(before);
      expect(await database.db.evidenceSnapshot.count({ where: { investigationId: investigation.id } })).toBe(0);
      await writeFile(evidence, "");
      expect(cli([...failureFlags.slice(0, -2), "--run-id", "empty-evidence"]).stderr).toContain("失败证据文件不能为空");
      await unlink(evidence);
      expect(cli([...failureFlags.slice(0, -2), "--run-id", "missing-evidence"]).status).toBe(1);
      const notRun = cli(["--not-run", "--reason", "Not submitted", "--run-id", "not-run-cli"], "invalid-url");
      expect(notRun.status, notRun.stderr).toBe(0);
      expect(D1RunRecordSchema.parse(JSON.parse(await readFile(join(directory, "cases/runs/A-01/not-run-cli.json"), "utf8"))).execution).toBe("NOT_RUN");
    } finally {
      await database.db.investigation.delete({ where: { id: investigation.id } });
      await rm(directory, { recursive: true, force: true });
    }
  });

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
    const completedAt = await readDatabaseTime(tx);
    await tx.investigation.update({ where: { id: investigation.id }, data: { status: "SUCCEEDED", stage: "COMPLETED", completedAt, updatedAt: completedAt, resultSnapshotId: snapshot.id } });

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
      caseId: "A-01", caseType: "A", caseQuestion: investigation.question, intent: "objective",
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

  it("loads the CLI database URL from an env file without writing a run or business data", async () => {
    const directory = await mkdtemp(join(tmpdir(), "d1-cli-env-"));
    const path = join(directory, ".env");
    try {
      await writeFile(path, `DATABASE_URL=${database.connectionString}\n`);
      const env: NodeJS.ProcessEnv = { ...process.env, DOTENV_CONFIG_PATH: path };
      delete env.DATABASE_URL;
      const id = randomUUID();
      const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/d1/evaluate.ts", "--case", "A-01", "--investigation", id, "--snapshot", randomUUID()], { env, encoding: "utf8", timeout: 10000, windowsHide: true });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`未找到 investigation：${id}`);
      expect(await database.db.investigation.count()).toBe(0);
    } finally {
      await unlink(path);
      await rmdir(directory);
    }
  });
});
