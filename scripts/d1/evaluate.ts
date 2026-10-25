import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { createDatabaseClient, InvestigationRepository } from "../../src/server/storage";
import { loadCaseRecord } from "./case";
import { buildFailedRunRecord, buildNotRunRecord, buildRunRecord, evaluateSnapshot, type D1Review } from "./rules";
import { writeRunRecord } from "./store";

type Args = {
  caseId: string | null;
  investigation: string | null;
  snapshot: string | null;
  runId: string | null;
  intent: "objective" | "advice";
  notRun: boolean;
  failed: boolean;
  evidence: string | null;
  reason: string | null;
  reviewStatus: "NOT_REVIEWED" | "REVIEWED";
  reviewer: string | null;
  reviewedAt: string | null;
  reviewOpinion: string | null;
};

function usage(): string {
  return [
    "用法：",
    "  npm run d1:evaluate -- --case A-01 --investigation <UUID> --snapshot <UUID> [--run-id <id>] [--intent objective|advice]",
    "  npm run d1:evaluate -- --case A-01 --not-run --reason \"具体阻塞原因\" [--run-id <id>]",
    "  npm run d1:evaluate -- --case A-01 --failed --investigation <UUID> --reason \"实际失败原因\" --evidence <已保存的日志或状态文件> [--run-id <id>]",
    "",
    "说明：",
    "- 真实运行只读 investigation/snapshot/answers/advice，不写数据库。",
    "- 每次运行写入 cases/runs/<caseId>/<runId>.json，使用 wx，绝不覆盖旧记录。",
    "- 只有未提交调查才用 --not-run；已执行失败无快照用 --failed，从数据库核实真实状态。"
  ].join("\n");
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    caseId: null, investigation: null, snapshot: null, runId: null, intent: "objective",
    notRun: false, failed: false, evidence: null, reason: null, reviewStatus: "NOT_REVIEWED", reviewer: null, reviewedAt: null, reviewOpinion: null
  };
  const valueFlags: Record<string, true> = {
    "--case": true, "--investigation": true, "--snapshot": true, "--run-id": true, "--intent": true,
    "--reason": true, "--evidence": true, "--review-status": true, "--reviewer": true, "--reviewed-at": true, "--review-opinion": true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag) continue;
    if (flag === "--help" || flag === "-h") { console.log(usage()); process.exit(0); }
    if (flag === "--not-run") { args.notRun = true; continue; }
    if (flag === "--failed") { args.failed = true; continue; }
    if (!valueFlags[flag]) throw new Error(`未知参数：${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`参数 ${flag} 缺少值`);
    index += 1;
    if (flag === "--case") args.caseId = value;
    else if (flag === "--investigation") args.investigation = value;
    else if (flag === "--snapshot") args.snapshot = value;
    else if (flag === "--run-id") args.runId = value;
    else if (flag === "--intent") {
      if (value !== "objective" && value !== "advice") throw new Error("--intent 只能是 objective 或 advice");
      args.intent = value;
    } else if (flag === "--reason") args.reason = value;
    else if (flag === "--evidence") args.evidence = value;
    else if (flag === "--review-status") {
      if (value !== "NOT_REVIEWED" && value !== "REVIEWED") throw new Error("--review-status 只能是 NOT_REVIEWED 或 REVIEWED");
      args.reviewStatus = value;
    } else if (flag === "--reviewer") args.reviewer = value;
    else if (flag === "--reviewed-at") args.reviewedAt = value;
    else if (flag === "--review-opinion") args.reviewOpinion = value;
  }
  if (!args.caseId) throw new Error("缺少 --case A-01/B-01/C-01");
  if (args.notRun && args.failed) throw new Error("--not-run 与 --failed 互斥");
  if (args.notRun) {
    if (!args.reason?.trim()) throw new Error("--not-run 需要 --reason");
    if (args.investigation || args.snapshot || args.evidence) throw new Error("--not-run 不能提供 investigation/snapshot/evidence");
    if (args.intent !== "objective") throw new Error("--not-run 只记录客观案例未运行");
  } else {
    z.string().uuid().parse(args.investigation);
    if (args.failed) {
      if (args.snapshot) throw new Error("--failed 用于无快照失败，不能提供 --snapshot");
      if (!args.reason?.trim() || !args.evidence?.trim()) throw new Error("--failed 需要 --reason 和 --evidence");
    } else {
      if (!args.snapshot) throw new Error("成功结果评估需要 --snapshot；已失败无快照用 --failed，未运行用 --not-run");
      z.string().uuid().parse(args.snapshot);
      if (args.reason || args.evidence) throw new Error("结果评估不能提供失败原因或证据参数");
    }
  }
  return args;
}

function reviewFrom(args: Args): D1Review {
  if (args.reviewStatus === "NOT_REVIEWED") return { status: "NOT_REVIEWED", reviewer: null, reviewedAt: null, opinionPath: null };
  if (!args.reviewer || !args.reviewedAt || !args.reviewOpinion) throw new Error("REVIEWED 需要 --reviewer、--reviewed-at、--review-opinion");
  if (Number.isNaN(Date.parse(args.reviewedAt))) throw new Error("--reviewed-at 不是有效时间");
  return { status: "REVIEWED", reviewer: args.reviewer, reviewedAt: args.reviewedAt, opinionPath: args.reviewOpinion };
}

async function appVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as { version?: string };
  return pkg.version ?? "unknown";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.caseId) throw new Error("缺少 --case A-01/B-01/C-01");
  const caseRecord = await loadCaseRecord(args.caseId);
  const runAt = new Date().toISOString();
  const runId = args.runId ?? `${runAt.replace(/[:.]/g, "-")}__${args.notRun ? "NOT_RUN" : args.failed ? "FAILED" : "RUN"}__${randomUUID()}`;
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) throw new Error("--run-id 只能包含字母、数字、点、下划线、短横线");
  const review = reviewFrom(args);
  const version = await appVersion();

  if (args.notRun) {
    if (!args.reason) throw new Error("--not-run 需要 --reason");
    if (args.investigation || args.snapshot) throw new Error("--not-run 不能同时提供 investigation/snapshot");
    const record = buildNotRunRecord({ caseRecord, runId, runAt, appVersion: version, nodeVersion: process.version, reason: args.reason, review, notes: ["NOT_RUN：没有模拟调查结果。"] });
    const path = await writeRunRecord(record);
    console.log(JSON.stringify({ caseId: caseRecord.caseId, runId, execution: record.execution, verdict: record.verdict, path }, null, 2));
    return;
  }

  const db = createDatabaseClient();
  try {
    const repository = new InvestigationRepository(db);
    const investigation = await repository.findInvestigation(args.investigation);
    if (!investigation) throw new Error(`未找到 investigation：${args.investigation}`);
    if (args.failed) {
      const evidence = await readFile(args.evidence!);
      if (!evidence.length) throw new Error("失败证据文件不能为空");
      const record = buildFailedRunRecord({
        caseRecord, runId, runAt, intent: args.intent, appVersion: version, nodeVersion: process.version,
        investigation, reason: args.reason!, evidence: { path: args.evidence!, sha256: createHash("sha256").update(evidence).digest("hex") },
        review, notes: ["只读数据库核实 FAILED 状态；未评估快照，也未生成回答；证据文件须保留供人工复核。"]
      });
      const path = await writeRunRecord(record);
      console.log(JSON.stringify({ caseId: caseRecord.caseId, runId, execution: record.execution, verdict: record.verdict, investigationId: investigation.id, snapshotId: null, path }, null, 2));
      process.exitCode = 2;
      return;
    }
    const snapshot = await repository.findSnapshot(args.snapshot);
    if (!snapshot) throw new Error(`未找到 snapshot：${args.snapshot}`);
    const rows = await db.answer.findMany({ where: { snapshotId: snapshot.id }, orderBy: [{ generatedAt: "desc" }, { id: "asc" }], select: { id: true } });
    const answers = [];
    for (const row of rows) {
      const answer = await repository.findAnswer(row.id);
      if (!answer) throw new Error(`回答 ${row.id} 读取失败`);
      answers.push(answer);
    }
    const adviceCount = await db.advice.count({ where: { snapshotId: snapshot.id } });
    const parentSnapshot = snapshot.parentSnapshotId ? await repository.findSnapshot(snapshot.parentSnapshotId) : null;
    const evaluation = evaluateSnapshot({
      caseId: caseRecord.caseId, caseType: caseRecord.caseType, caseQuestion: caseRecord.question, intent: args.intent,
      investigation, snapshot, answers, adviceCount, parentSnapshot
    });
    const record = buildRunRecord({ caseRecord, runId, runAt, intent: args.intent, appVersion: version, nodeVersion: process.version, evaluation, review, notes: ["评估器只读；未写入 investigation/snapshot/answer/advice。"] });
    const path = await writeRunRecord(record);
    console.log(JSON.stringify({ caseId: caseRecord.caseId, runId, execution: record.execution, verdict: record.verdict, investigationId: record.system.investigationId, snapshotId: record.system.snapshotId, path }, null, 2));
    if (record.verdict === "FAIL") process.exitCode = 2;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
