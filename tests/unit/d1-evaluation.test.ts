import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InvestigationSchema, type EvidenceSnapshot, type Investigation } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";
import { loadCaseRecord } from "../../scripts/d1/case";
import {
  D1OwnerSchema,
  D1RunRecordSchema,
  buildNotRunRecord,
  buildFailedRunRecord,
  buildRunRecord,
  evaluateSnapshot,
  type D1CaseRecord,
  type D1Review,
  type EvaluationResult
} from "../../scripts/d1/rules";
import { writeRunRecord } from "../../scripts/d1/store";
import { parseArgs } from "../../scripts/d1/evaluate";

const timestamp = "2026-10-24T10:00:00.000Z";

function validSnapshot(): EvidenceSnapshot {
  const snapshot = makeSnapshot();
  snapshot.evidence[0]!.metadata = {
    ...snapshot.evidence[0]!.metadata,
    title: "Synthetic test source",
    siteName: "example.com",
    sourceType: "THIRD_PARTY",
    contentKind: "FACT",
    independence: "INDEPENDENT",
    independenceReason: "Synthetic test fixture with a single independent source"
  };
  return snapshot;
}

function succeededInvestigation(snapshot: EvidenceSnapshot): Investigation {
  return InvestigationSchema.parse({
    id: snapshot.investigationId,
    question: "Synthetic D1 evaluation question",
    status: "SUCCEEDED",
    stage: "COMPLETED",
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: timestamp,
    completedAt: timestamp,
    resultSnapshotId: snapshot.id
  });
}

function evaluate(snapshot: EvidenceSnapshot, overrides: { caseQuestion?: string; adviceCount?: number; investigation?: unknown; answers?: unknown[]; parentSnapshot?: unknown | null } = {}): EvaluationResult {
  return evaluateSnapshot({
    caseId: "A-01",
    caseType: "A",
    caseQuestion: overrides.caseQuestion ?? "Synthetic D1 evaluation question",
    intent: "objective",
    investigation: overrides.investigation ?? succeededInvestigation(snapshot),
    snapshot,
    answers: overrides.answers ?? [makeAnswer(snapshot)],
    adviceCount: overrides.adviceCount ?? 0,
    parentSnapshot: overrides.parentSnapshot ?? null
  });
}

function checkStatus(result: EvaluationResult, id: string) {
  return result.checks.find((item) => item.id === id)?.status;
}

describe("D1 deterministic evaluator", () => {
  it("keeps successful records bound to their real evaluated snapshot", async () => {
    const snapshot = validSnapshot();
    const caseRecord = await loadCaseRecord("A-01");
    const evaluation = evaluate(snapshot, { caseQuestion: caseRecord.question, investigation: { ...succeededInvestigation(snapshot), question: caseRecord.question } });
    const record = buildRunRecord({ caseRecord, runId: "success-test", runAt: timestamp, intent: "objective", appVersion: "test", nodeVersion: "test", evaluation, review: { status: "NOT_REVIEWED", reviewer: null, reviewedAt: null, opinionPath: null }, notes: [] });
    expect(record.execution).toBe("COMPLETED");
    expect(record.system.snapshotId).toBe(snapshot.id);
    expect(record.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(record.failure).toBeUndefined();
  });

  it("records a failed investigation without inventing a snapshot or losing its error", async () => {
    const caseRecord = await loadCaseRecord("A-01");
    const investigation = { ...succeededInvestigation(validSnapshot()), question: caseRecord.question, status: "FAILED", stage: "IDENTITY", resultSnapshotId: null, error: { code: "PROVIDER_NOT_CONFIGURED", message: "Synthetic configuration failure", retryable: false } };
    const input = { caseRecord, runId: "failed-test", runAt: timestamp, appVersion: "test", nodeVersion: "test", intent: "objective" as const, reason: "Synthetic failure only", investigation, evidence: { path: "test-only-status.json", sha256: "d".repeat(64) }, review: { status: "NOT_REVIEWED" as const, reviewer: null, reviewedAt: null, opinionPath: null }, notes: [] };
    const record = buildFailedRunRecord(input);
    expect(record.execution).toBe("FAILED");
    expect(record.verdict).toBe("FAIL");
    expect(record.system.investigationId).toBe(investigation.id);
    expect(record.system.snapshotId).toBeNull();
    expect(record.failure?.investigation).toEqual(investigation);
    expect(record.snapshot).toBeNull();
    expect(record.answers).toEqual([]);
    expect(record.review.status).toBe("NOT_REVIEWED");
    for (const patch of [{ status: "RUNNING", completedAt: null }, { status: "SUCCEEDED", stage: "COMPLETED", error: null, resultSnapshotId: randomUUID() }, { error: null }, { question: "Different question" }, { resultSnapshotId: randomUUID() }]) {
      expect(() => buildFailedRunRecord({ ...input, investigation: { ...investigation, ...patch } })).toThrow();
    }
    expect(() => buildFailedRunRecord({ ...input, reason: " " })).toThrow();
    for (const patch of [{ failure: undefined }, { verdict: "PASS" }, { answers: [makeAnswer(validSnapshot())] }, { system: { ...record.system, investigationId: randomUUID() } }]) {
      expect(D1RunRecordSchema.safeParse({ ...record, ...patch }).success).toBe(false);
    }
  });

  it("validates mutually exclusive CLI modes and required IDs before database access", () => {
    const id = randomUUID();
    const base = ["--case", "A-01"];
    const failure = ["--failed", "--investigation", id, "--reason", "Actual failure", "--evidence", "status.json"];
    expect(parseArgs([...base, ...failure]).failed).toBe(true);
    expect(parseArgs([...base, "--investigation", id, "--snapshot", randomUUID()]).snapshot).toBeTruthy();
    expect(parseArgs([...base, "--not-run", "--reason", "Not submitted"]).notRun).toBe(true);
    for (const flags of [[], ["--investigation", id], ["--not-run"], ["--not-run", "--reason", " "], ["--not-run", ...failure], [...failure, "--snapshot", randomUUID()], ["--failed", "--investigation", id], ["--failed", "--investigation", "invalid", "--reason", "Failure", "--evidence", "status.json"], ["--not-run", "--reason", "Not submitted", "--investigation", id], ["--investigation", id, "--snapshot", "invalid"]]) {
      expect(() => parseArgs([...base, ...flags])).toThrow();
    }
  });

  it("reads historical issue owners without rewriting them", () => {
    for (const owner of ["甲", "乙丙", "丙", "乙/公共工程"]) {
      expect(D1OwnerSchema.parse(owner)).toBe(owner);
    }
  });

  it("passes a structurally valid snapshot and answer", () => {
    const result = evaluate(validSnapshot());
    expect(result.verdict).toBe("PASS");
    expect(result.checks.every((item) => item.status === "PASS")).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.independentOrigins).toHaveLength(1);
    expect(result.independentOrigins[0]?.classification).toBe("INDEPENDENT");
  });

  it("fails when an answer quote does not exactly match saved evidence", () => {
    const snapshot = validSnapshot();
    const answer = makeAnswer(snapshot);
    answer.citations[0]!.quotes![0]!.originalExcerpt = "Rewritten quote";
    const result = evaluate(snapshot, { answers: [answer] });
    expect(checkStatus(result, "R3_QUOTE_MATCH")).toBe("FAIL");
    expect(result.verdict).toBe("FAIL");
    expect(result.issues.some((issue) => issue.owner === "乙丙")).toBe(true);
  });

  it("fails when required source metadata is missing", () => {
    const snapshot = validSnapshot();
    snapshot.evidence[0]!.metadata = { ...snapshot.evidence[0]!.metadata, sourceType: "UNKNOWN" };
    const result = evaluate(snapshot);
    expect(checkStatus(result, "R4_SOURCE_METADATA")).toBe("FAIL");
    expect(result.issues.some((issue) => issue.owner === "甲")).toBe(true);
  });

  it("fails when two evidence items from one origin are marked independent", () => {
    const snapshot = validSnapshot();
    const base = snapshot.evidence[0]!;
    snapshot.evidence.push({
      ...base,
      id: randomUUID(),
      metadata: { ...base.metadata, independenceReason: "Synthetic duplicate source" }
    });
    const result = evaluate(snapshot);
    expect(checkStatus(result, "R5_SOURCE_INDEPENDENCE")).toBe("FAIL");
  });

  it("fails when an objective run has unrequested advice", () => {
    const result = evaluate(validSnapshot(), { adviceCount: 1 });
    expect(checkStatus(result, "R6_UNREQUESTED_ADVICE")).toBe("FAIL");
  });

  it("fails a failed task even if a snapshot is supplied", () => {
    const snapshot = validSnapshot();
    const investigation = InvestigationSchema.parse({
      ...succeededInvestigation(snapshot),
      status: "FAILED",
      stage: "VERIFICATION",
      error: { code: "PROVIDER_FAILED", message: "Synthetic failure", retryable: false },
      resultSnapshotId: null,
      completedAt: timestamp
    });
    const result = evaluate(snapshot, { investigation });
    expect(checkStatus(result, "R7_TASK_SUCCESS")).toBe("FAIL");
  });

  it("fails when case and snapshot investigation are not associated", () => {
    const snapshot = validSnapshot();
    const investigation = succeededInvestigation(snapshot);
    snapshot.investigationId = randomUUID();
    const result = evaluate(snapshot, { investigation });
    expect(checkStatus(result, "R9_CASE_ASSOCIATION")).toBe("FAIL");
  });

  it("rejects a valid result for a different case question", () => {
    const snapshot = validSnapshot();
    const investigation = { ...succeededInvestigation(snapshot), question: "An unrelated product question" };
    const result = evaluate(snapshot, { investigation });
    expect(checkStatus(result, "R9_CASE_ASSOCIATION")).toBe("FAIL");
    expect(result.verdict).toBe("FAIL");
  });

  it("matches the question using the same outer whitespace normalization as HTTP", () => {
    expect(evaluate(validSnapshot(), { caseQuestion: "  Synthetic D1 evaluation question\n" }).verdict).toBe("PASS");
  });

  it("records NOT_RUN without inventing a system result", () => {
    const caseRecord: D1CaseRecord = {
      caseId: "A-01", caseType: "A", title: "Synthetic case", question: "Synthetic question?",
      questionSha256: "a".repeat(64), casePath: "cases/A/A-01/case.md", referencePath: "cases/A/A-01/reference.md",
      caseSha256: "b".repeat(64), referenceSha256: "c".repeat(64), referenceStatus: "待人工核实",
      confirmedBy: null, confirmedAt: null
    };
    const review: D1Review = { status: "NOT_REVIEWED", reviewer: null, reviewedAt: null, opinionPath: null };
    const record = buildNotRunRecord({
      caseRecord, runId: "not-run-1", runAt: timestamp, appVersion: "test", nodeVersion: "test",
      reason: "Synthetic blocker", review, notes: ["test"]
    });
    expect(record.execution).toBe("NOT_RUN");
    expect(record.verdict).toBe("NOT_RUN");
    expect(record.snapshot).toBeNull();
    expect(record.answers).toEqual([]);
    expect(record.issues[0]?.owner).toBe("甲");
    expect(D1RunRecordSchema.safeParse(record).success).toBe(true);
  });

  it("never overwrites an existing run record", async () => {
    const root = await mkdtemp(join(tmpdir(), "d1-run-"));
    const caseRecord: D1CaseRecord = {
      caseId: "A-01", caseType: "A", title: "Synthetic case", question: "Synthetic question?",
      questionSha256: "a".repeat(64), casePath: "cases/A/A-01/case.md", referencePath: "cases/A/A-01/reference.md",
      caseSha256: "b".repeat(64), referenceSha256: "c".repeat(64), referenceStatus: "待人工核实",
      confirmedBy: null, confirmedAt: null
    };
    const review: D1Review = { status: "NOT_REVIEWED", reviewer: null, reviewedAt: null, opinionPath: null };
    const record = buildNotRunRecord({
      caseRecord, runId: "same-run", runAt: timestamp, appVersion: "test", nodeVersion: "test",
      reason: "Synthetic blocker", review, notes: []
    });
    try {
      const first = await writeRunRecord(record, root);
      expect(first.endsWith("same-run.json")).toBe(true);
      await expect(writeRunRecord(record, root)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("loads real case metadata and verifies the question hash", async () => {
    const record = await loadCaseRecord("C-01");
    expect(record.caseId).toBe("C-01");
    expect(record.caseType).toBe("C");
    expect(record.question).toContain("GitHub Copilot Free");
  });

  it("validates every stored run record against the D1 schema", async () => {
    for (const caseId of ["A-01", "B-01", "C-01"]) {
      const directory = join("cases", "runs", caseId);
      const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const parsed = JSON.parse(await readFile(join(directory, file), "utf8")) as unknown;
        const result = D1RunRecordSchema.safeParse(parsed);
        expect(result.success, `${caseId}/${file}`).toBe(true);
        if (result.success) expect(result.data.case.caseId).toBe(caseId);
      }
    }
  });
});
