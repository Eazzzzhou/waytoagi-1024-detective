import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AnswerSchema,
  EvidenceSnapshotSchema,
  InvestigationSchema,
  TimestampSchema,
  assertAnswerReferences,
  type Answer,
  type EvidenceSnapshot,
  type Investigation
} from "../../src/contracts";

export const D1_EVALUATOR_VERSION = "0.1.0";
export const D1_RUN_SCHEMA_VERSION = "d1-run/1" as const;

export const D1CheckStatusSchema = z.enum(["PASS", "FAIL", "WARN", "NOT_APPLICABLE", "NOT_RUN"]);
export type D1CheckStatus = z.infer<typeof D1CheckStatusSchema>;

export const D1VerdictSchema = z.enum(["PASS", "FAIL", "NEEDS_HUMAN", "NOT_RUN"]);
export type D1Verdict = z.infer<typeof D1VerdictSchema>;

export const D1OwnerSchema = z.enum(["甲", "丙", "乙/公共工程"]);
export type D1Owner = z.infer<typeof D1OwnerSchema>;

export const D1CheckSchema = z.strictObject({
  id: z.string().min(1),
  status: D1CheckStatusSchema,
  message: z.string(),
  details: z.string().nullable()
});
export type D1Check = z.infer<typeof D1CheckSchema>;

export const D1IssueSchema = z.strictObject({
  id: z.string().min(1),
  checkId: z.string().min(1),
  severity: z.enum(["blocking", "major", "minor"]),
  owner: D1OwnerSchema,
  title: z.string().min(1),
  reproduction: z.string().min(1),
  expected: z.string().min(1),
  actual: z.string().min(1),
  evidence: z.string().min(1),
  status: z.enum(["open", "fixed", "retest", "closed"])
});
export type D1Issue = z.infer<typeof D1IssueSchema>;

export const D1IndependentOriginSchema = z.strictObject({
  key: z.string().min(1),
  evidenceIds: z.array(z.string().uuid()),
  classification: z.enum(["INDEPENDENT", "SHARED_ORIGIN", "UNKNOWN"])
});
export type D1IndependentOrigin = z.infer<typeof D1IndependentOriginSchema>;

export const D1CaseRecordSchema = z.strictObject({
  caseId: z.string().regex(/^[ABC]-\d{2}$/),
  caseType: z.enum(["A", "B", "C"]),
  title: z.string().min(1),
  question: z.string().min(1),
  questionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  casePath: z.string().min(1),
  referencePath: z.string().min(1),
  caseSha256: z.string().regex(/^[a-f0-9]{64}$/),
  referenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  referenceStatus: z.string().nullable(),
  confirmedBy: z.string().nullable(),
  confirmedAt: z.string().nullable()
});
export type D1CaseRecord = z.infer<typeof D1CaseRecordSchema>;

export const D1ReviewSchema = z.strictObject({
  status: z.enum(["NOT_REVIEWED", "REVIEWED"]),
  reviewer: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  opinionPath: z.string().nullable()
});
export type D1Review = z.infer<typeof D1ReviewSchema>;

export const D1SystemSchema = z.strictObject({
  investigationId: z.string().uuid().nullable(),
  snapshotId: z.string().uuid().nullable(),
  snapshotVersion: z.number().int().positive().nullable(),
  snapshotGeneratedAt: TimestampSchema.nullable(),
  contractVersion: z.string().nullable(),
  appVersion: z.string(),
  nodeVersion: z.string(),
  readOnly: z.literal(true)
});
export type D1System = z.infer<typeof D1SystemSchema>;

export const D1RunRecordSchema = z.strictObject({
  schemaVersion: z.literal(D1_RUN_SCHEMA_VERSION),
  evaluatorVersion: z.string().min(1),
  runId: z.string().regex(/^[A-Za-z0-9._-]+$/),
  case: D1CaseRecordSchema,
  submission: z.strictObject({
    runAt: TimestampSchema,
    intent: z.enum(["objective", "advice"]),
    question: z.string().min(1),
    questionSha256: z.string().regex(/^[a-f0-9]{64}$/)
  }),
  execution: z.enum(["COMPLETED", "NOT_RUN"]),
  system: D1SystemSchema,
  snapshot: EvidenceSnapshotSchema.nullable(),
  answers: z.array(AnswerSchema),
  adviceCount: z.number().int().nonnegative().nullable(),
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  checks: z.array(D1CheckSchema),
  independentOrigins: z.array(D1IndependentOriginSchema),
  issues: z.array(D1IssueSchema),
  review: D1ReviewSchema,
  verdict: D1VerdictSchema,
  notes: z.array(z.string())
});
export type D1RunRecord = z.infer<typeof D1RunRecordSchema>;

export type EvaluationResult = {
  investigation: Investigation | null;
  snapshot: EvidenceSnapshot | null;
  answers: Answer[];
  adviceCount: number | null;
  checks: D1Check[];
  independentOrigins: D1IndependentOrigin[];
  issues: D1Issue[];
  verdict: D1Verdict;
};

export type EvaluateInput = {
  caseId: string;
  caseType: "A" | "B" | "C";
  intent: "objective" | "advice";
  investigation: unknown;
  snapshot: unknown;
  answers: unknown[];
  adviceCount: number;
  parentSnapshot: unknown | null;
};

const check = (id: string, status: D1CheckStatus, message: string, details: string | null = null): D1Check => ({ id, status, message, details });
const errorText = (error: z.ZodError) => error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

function issueFor(checkValue: D1Check): D1Issue | null {
  if (checkValue.status !== "FAIL" && checkValue.status !== "WARN") return null;
  const owner: D1Owner = ["R4_SOURCE_METADATA", "R5_SOURCE_INDEPENDENCE", "R6_UNREQUESTED_ADVICE", "R7_TASK_SUCCESS", "R10_ANSWER_CITATIONS"].includes(checkValue.id) ? "甲" : "乙/公共工程";
  return {
    id: checkValue.id,
    checkId: checkValue.id,
    severity: checkValue.status === "FAIL" ? "blocking" : "minor",
    owner,
    title: checkValue.message,
    reproduction: "使用真实 investigation/snapshot 运行 npm run d1:evaluate -- --case <ID> --investigation <UUID> --snapshot <UUID>",
    expected: "真实快照满足该确定性规则；语义正确性仍需人工/独立复核",
    actual: checkValue.details ?? checkValue.message,
    evidence: checkValue.details ?? "见 checks 详情",
    status: "open"
  };
}

function independenceGroups(snapshot: EvidenceSnapshot): { groups: D1IndependentOrigin[]; problems: string[]; warnings: string[] } {
  const map = new Map<string, { ids: string[]; flags: Set<string> }>();
  const warnings: string[] = [];
  for (const evidence of snapshot.evidence) {
    if (evidence.readStatus !== "READ") continue;
    const key = evidence.metadata.originGroupId ?? normalizeUrl(evidence.metadata.upstreamUrl ?? evidence.sourceUrl);
    const current = map.get(key) ?? { ids: [], flags: new Set<string>() };
    current.ids.push(evidence.id);
    current.flags.add(evidence.metadata.independence);
    map.set(key, current);
    if (evidence.translation && evidence.originalExcerpt && evidence.translation === evidence.originalExcerpt) {
      warnings.push(`${evidence.id}: translation 与 originalExcerpt 完全相同`);
    }
  }
  const groups: D1IndependentOrigin[] = [];
  const problems: string[] = [];
  for (const [key, value] of map) {
    const independentCount = snapshot.evidence.filter((evidence) => value.ids.includes(evidence.id) && evidence.metadata.independence === "INDEPENDENT").length;
    if (independentCount > 1) problems.push(`${key}: 同一 upstream 组内有 ${independentCount} 条 INDEPENDENT 证据`);
    if (value.flags.has("INDEPENDENT") && value.flags.has("SHARED_ORIGIN")) problems.push(`${key}: 同一组同时标 INDEPENDENT 和 SHARED_ORIGIN`);
    const classification = value.flags.size === 1 && value.flags.has("INDEPENDENT")
      ? "INDEPENDENT"
      : value.flags.has("SHARED_ORIGIN")
        ? "SHARED_ORIGIN"
        : "UNKNOWN";
    groups.push({ key, evidenceIds: value.ids, classification });
  }
  return { groups, problems, warnings };
}

export function evaluateSnapshot(input: EvaluateInput): EvaluationResult {
  const investigationParsed = InvestigationSchema.safeParse(input.investigation);
  const snapshotParsed = EvidenceSnapshotSchema.safeParse(input.snapshot);
  const answersParsed = z.array(AnswerSchema).safeParse(input.answers ?? []);
  const parseProblems = [
    investigationParsed.success ? null : `investigation: ${errorText(investigationParsed.error)}`,
    snapshotParsed.success ? null : `snapshot: ${errorText(snapshotParsed.error)}`,
    answersParsed.success ? null : `answers: ${errorText(answersParsed.error)}`
  ].filter((value): value is string => Boolean(value));

  if (!investigationParsed.success || !snapshotParsed.success || !answersParsed.success) {
    const checks = [check("R1_SNAPSHOT_CONTRACT", "FAIL", "调查/快照/回答不符合共享 Zod 契约", parseProblems.join(" | "))];
    return {
      investigation: null,
      snapshot: null,
      answers: [],
      adviceCount: input.adviceCount,
      checks,
      independentOrigins: [],
      issues: checks.map(issueFor).filter((value): value is D1Issue => Boolean(value)),
      verdict: "FAIL"
    };
  }

  const investigation = investigationParsed.data;
  const snapshot = snapshotParsed.data;
  const answers = answersParsed.data;
  const checks: D1Check[] = [];
  checks.push(check("R1_SNAPSHOT_CONTRACT", "PASS", "调查/快照/回答通过共享 Zod 契约"));

  const claimIds = new Set(snapshot.claims.map((claim) => claim.id));
  const evidenceIds = new Set(snapshot.evidence.map((evidence) => evidence.id));
  const referenceProblems: string[] = [];
  for (const relation of snapshot.relations) {
    if (!claimIds.has(relation.claimId)) referenceProblems.push(`relation claim ${relation.claimId} 不存在`);
    if (!evidenceIds.has(relation.evidenceId)) referenceProblems.push(`relation evidence ${relation.evidenceId} 不存在`);
  }
  for (const conflict of snapshot.conflicts) {
    for (const id of conflict.claimIds) if (!claimIds.has(id)) referenceProblems.push(`conflict claim ${id} 不存在`);
    for (const id of conflict.evidenceIds) if (!evidenceIds.has(id)) referenceProblems.push(`conflict evidence ${id} 不存在`);
  }
  for (const gap of snapshot.gaps) for (const id of gap.claimIds) if (!claimIds.has(id)) referenceProblems.push(`gap claim ${id} 不存在`);
  for (const record of snapshot.retrievalRecords) for (const source of record.returnedSources) {
    if (source.evidenceId && !evidenceIds.has(source.evidenceId)) referenceProblems.push(`retrieval evidence ${source.evidenceId} 不存在`);
  }
  for (const answer of answers) {
    for (const citation of answer.citations) {
      for (const id of citation.claimIds) if (!claimIds.has(id)) referenceProblems.push(`answer ${answer.id} claim ${id} 不存在`);
      for (const id of citation.evidenceIds) if (!evidenceIds.has(id)) referenceProblems.push(`answer ${answer.id} evidence ${id} 不存在`);
    }
  }
  checks.push(check("R2_REFERENCE_IDS", referenceProblems.length ? "FAIL" : "PASS", referenceProblems.length ? "引用 ID 存在悬空" : "引用 ID 均存在", referenceProblems.join(" | ") || null));

  const quoteProblems: string[] = [];
  for (const answer of answers) {
    try { assertAnswerReferences(answer, snapshot, true); }
    catch (error) {
      if (error instanceof z.ZodError) quoteProblems.push(`${answer.id}: ${errorText(error)}`);
      else quoteProblems.push(`${answer.id}: ${String(error)}`);
    }
  }
  checks.push(check("R3_QUOTE_MATCH", quoteProblems.length ? "FAIL" : "PASS", quoteProblems.length ? "引用原句与保存证据不匹配" : "引用原句逐字符匹配", quoteProblems.join(" | ") || null));

  const metadataProblems: string[] = [];
  for (const evidence of snapshot.evidence) {
    if (!evidence.metadata.title && !evidence.metadata.siteName) metadataProblems.push(`${evidence.id}: 缺少 title 和 siteName`);
    if (evidence.metadata.sourceType === "UNKNOWN") metadataProblems.push(`${evidence.id}: sourceType=UNKNOWN`);
    if (evidence.metadata.contentKind === "UNKNOWN") metadataProblems.push(`${evidence.id}: contentKind=UNKNOWN`);
    if (evidence.readStatus === "READ" && (!evidence.originalExcerpt || !evidence.originalLocation || !evidence.contentHash)) metadataProblems.push(`${evidence.id}: READ 缺少原句/定位/hash`);
  }
  checks.push(check("R4_SOURCE_METADATA", metadataProblems.length ? "FAIL" : "PASS", metadataProblems.length ? "必要来源元数据缺失" : "必要来源元数据齐全", metadataProblems.join(" | ") || null));

  const independence = independenceGroups(snapshot);
  const independenceStatus: D1CheckStatus = independence.problems.length ? "FAIL" : independence.warnings.length ? "WARN" : "PASS";
  checks.push(check("R5_SOURCE_INDEPENDENCE", independenceStatus, independenceStatus === "PASS" ? "未发现同源误计为独立" : "来源独立性或原文/译文分组有问题", [...independence.problems, ...independence.warnings].join(" | ") || null));

  checks.push(check("R6_UNREQUESTED_ADVICE", input.intent === "objective" && input.adviceCount > 0 ? "FAIL" : "PASS", input.intent === "objective" && input.adviceCount > 0 ? "客观问题快照存在未请求的 Advice" : "未发现未请求的 Advice", input.intent === "objective" && input.adviceCount > 0 ? `adviceCount=${input.adviceCount}` : null));

  const taskProblems: string[] = [];
  if (investigation.status !== "SUCCEEDED") taskProblems.push(`status=${investigation.status}`);
  if (investigation.stage !== "COMPLETED") taskProblems.push(`stage=${investigation.stage}`);
  if (investigation.error) taskProblems.push(`error=${investigation.error.code}`);
  if (!investigation.completedAt) taskProblems.push("completedAt=null");
  if (investigation.resultSnapshotId !== snapshot.id) taskProblems.push(`resultSnapshotId=${investigation.resultSnapshotId ?? "null"} != snapshot=${snapshot.id}`);
  checks.push(check("R7_TASK_SUCCESS", taskProblems.length ? "FAIL" : "PASS", taskProblems.length ? "失败或非成功任务不能当有效结果" : "任务状态为成功且指向该快照", taskProblems.join(" | ") || null));

  const historyProblems: string[] = [];
  if (snapshot.version === 1) {
    if (snapshot.parentSnapshotId) historyProblems.push("v1 不应有父快照");
  } else {
    const parentParsed = EvidenceSnapshotSchema.safeParse(input.parentSnapshot);
    if (!snapshot.parentSnapshotId) historyProblems.push("v>1 缺少 parentSnapshotId");
    if (!parentParsed.success) historyProblems.push("父快照缺失或不符合契约");
    else {
      const parent = parentParsed.data;
      if (parent.id !== snapshot.parentSnapshotId) historyProblems.push("parent id 不匹配");
      if (parent.investigationId !== snapshot.investigationId) historyProblems.push("parent investigation 不匹配");
      if (parent.version !== snapshot.version - 1) historyProblems.push("parent version 不是前一个版本");
    }
  }
  checks.push(check("R8_HISTORICAL_SNAPSHOT", historyProblems.length ? "FAIL" : "PASS", historyProblems.length ? "历史快照版本链不成立" : "快照版本/父链成立；评估器只读", historyProblems.join(" | ") || null));

  const associationProblems: string[] = [];
  if (!input.caseId.startsWith(`${input.caseType}-`)) associationProblems.push(`caseId ${input.caseId} 与 caseType ${input.caseType} 不一致`);
  if (snapshot.investigationId !== investigation.id) associationProblems.push("snapshot.investigationId 与 investigation.id 不一致");
  checks.push(check("R9_CASE_ASSOCIATION", associationProblems.length ? "FAIL" : "PASS", associationProblems.length ? "案例/调查/快照关联不成立" : "案例与调查/快照关联成立", associationProblems.join(" | ") || null));

  const answerWarnings: string[] = [];
  if (answers.length === 0) answerWarnings.push("快照没有回答");
  if (snapshot.claims.length > 0 && answers.length > 0 && answers.every((answer) => answer.citations.length === 0)) answerWarnings.push("有主张但所有回答都没有引用");
  checks.push(check("R10_ANSWER_CITATIONS", answerWarnings.length ? "WARN" : "PASS", answerWarnings.length ? "回答为空或没有引用，需要人工确认" : "回答与引用存在", answerWarnings.join(" | ") || null));

  const issues = checks.map(issueFor).filter((value): value is D1Issue => Boolean(value));
  const verdict: D1Verdict = checks.some((item) => item.status === "FAIL") ? "FAIL" : checks.some((item) => item.status === "WARN") ? "NEEDS_HUMAN" : "PASS";
  return { investigation, snapshot, answers, adviceCount: input.adviceCount, checks, independentOrigins: independence.groups, issues, verdict };
}

export function snapshotDigest(snapshot: EvidenceSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function buildRunRecord(input: {
  caseRecord: D1CaseRecord;
  runId: string;
  runAt: string;
  intent: "objective" | "advice";
  appVersion: string;
  nodeVersion: string;
  evaluation: EvaluationResult;
  review: D1Review;
  notes: string[];
}): D1RunRecord {
  const { evaluation } = input;
  const record: D1RunRecord = {
    schemaVersion: D1_RUN_SCHEMA_VERSION,
    evaluatorVersion: D1_EVALUATOR_VERSION,
    runId: input.runId,
    case: input.caseRecord,
    submission: {
      runAt: input.runAt,
      intent: input.intent,
      question: input.caseRecord.question,
      questionSha256: input.caseRecord.questionSha256
    },
    execution: "COMPLETED",
    system: {
      investigationId: evaluation.investigation?.id ?? null,
      snapshotId: evaluation.snapshot?.id ?? null,
      snapshotVersion: evaluation.snapshot?.version ?? null,
      snapshotGeneratedAt: evaluation.snapshot?.generatedAt ?? null,
      contractVersion: evaluation.snapshot?.contractVersion ?? null,
      appVersion: input.appVersion,
      nodeVersion: input.nodeVersion,
      readOnly: true
    },
    snapshot: evaluation.snapshot,
    answers: evaluation.answers,
    adviceCount: evaluation.adviceCount,
    snapshotSha256: evaluation.snapshot ? snapshotDigest(evaluation.snapshot) : null,
    checks: evaluation.checks,
    independentOrigins: evaluation.independentOrigins,
    issues: evaluation.issues,
    review: input.review,
    verdict: evaluation.verdict,
    notes: input.notes
  };
  return D1RunRecordSchema.parse(record);
}

export function buildNotRunRecord(input: {
  caseRecord: D1CaseRecord;
  runId: string;
  runAt: string;
  appVersion: string;
  nodeVersion: string;
  reason: string;
  review: D1Review;
  notes: string[];
}): D1RunRecord {
  const checks = [check("SYSTEM_RUN", "NOT_RUN", "真实调查未运行", input.reason)];
  const issues: D1Issue[] = [{
    id: "SYSTEM_RUN",
    checkId: "SYSTEM_RUN",
    severity: "blocking",
    owner: "甲",
    title: "正式调查模块未接入，无法产生真实 investigation/snapshot",
    reproduction: "运行 npm run d1:evaluate -- --case <ID> --not-run --reason <具体阻塞>",
    expected: "使用正式 API/Worker 提交问题，得到真实 investigation ID、终态和 snapshot ID",
    actual: input.reason,
    evidence: "src/server/investigation/handler.ts 的 unavailable('investigation orchestration')；.env 注明真实适配器未实现",
    status: "open"
  }];
  const record: D1RunRecord = {
    schemaVersion: D1_RUN_SCHEMA_VERSION,
    evaluatorVersion: D1_EVALUATOR_VERSION,
    runId: input.runId,
    case: input.caseRecord,
    submission: {
      runAt: input.runAt,
      intent: "objective",
      question: input.caseRecord.question,
      questionSha256: input.caseRecord.questionSha256
    },
    execution: "NOT_RUN",
    system: {
      investigationId: null,
      snapshotId: null,
      snapshotVersion: null,
      snapshotGeneratedAt: null,
      contractVersion: null,
      appVersion: input.appVersion,
      nodeVersion: input.nodeVersion,
      readOnly: true
    },
    snapshot: null,
    answers: [],
    adviceCount: null,
    snapshotSha256: null,
    checks,
    independentOrigins: [],
    issues,
    review: input.review,
    verdict: "NOT_RUN",
    notes: input.notes
  };
  return D1RunRecordSchema.parse(record);
}
