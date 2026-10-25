import { randomUUID } from "node:crypto";
import type { Evidence, EvidenceSnapshot, ResearchAudit, ResearchCandidate, ResearchTask, RetrievalRecord } from "../../contracts";
import { normalizeSourceUrl } from "../retrieval";

export const normalizedQuery = (query: string) => query.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]+/gu, " ").trim();
export function addTask(audit: ResearchAudit, task: { label: string; requirementAnchor: string | null; evidenceNeed: ResearchTask["evidenceNeed"]; required: boolean }, parentId: string): ResearchTask | null {
  if (audit.tasks.length >= 40 || audit.tasks.some(item => normalizedQuery(item.label) === normalizedQuery(task.label))) return null;
  const anchor = task.requirementAnchor && audit.originalQuestion.includes(task.requirementAnchor) ? task.requirementAnchor : null;
  const value: ResearchTask = { id: randomUUID(), label: task.label, requirementAnchor: anchor, required: task.required && !!anchor, parentId,
    evidenceNeed: task.evidenceNeed, status: "UNATTEMPTED", claimIds: [], evidenceIds: [], attempts: 0, explanation: "尚未执行对应研究；原问题保留。" };
  audit.tasks.push(value); return value;
}

export function discoverCandidate(audit: ResearchAudit, input: { url: string; title?: string | null; snippet?: string | null; taskIds: string[]; recordId?: string; documentId?: string; fromUrl?: string }): ResearchCandidate | null {
  let canonicalUrl: string;
  try { canonicalUrl = normalizeSourceUrl(input.url); } catch { return null; }
  if (!/^https?:/.test(canonicalUrl)) return null;
  const discovery = { kind: input.recordId ? "SEARCH" as const : "DOCUMENT_LINK" as const, recordId: input.recordId ?? null, documentId: input.documentId ?? null, fromUrl: input.fromUrl ?? null };
  let candidate = audit.candidates.find(item => item.canonicalUrl === canonicalUrl);
  if (candidate) {
    candidate.taskIds = [...new Set([...candidate.taskIds, ...input.taskIds])];
    if (!candidate.discoveries.some(item => JSON.stringify(item) === JSON.stringify(discovery))) candidate.discoveries.push(discovery);
    return candidate;
  }
  if (audit.candidates.length >= audit.budget.maxCandidates) return null;
  const expectedSource = /github.com\/[^/]+\/[^/]+\/(issues|discussions)|news.ycombinator|reddit|forum/i.test(canonicalUrl) ? "DISCUSSION" : /docs\.|\/docs\/|\/api\/|\/pricing|\/LICENSE|\/license/i.test(canonicalUrl) ? "OFFICIAL" : /review|tested|experiment|blender|cad/i.test(`${input.title ?? ""} ${input.snippet ?? ""}`) ? "REPORT" : "UNKNOWN";
  candidate = { id: randomUUID(), url: input.url, canonicalUrl, title: input.title?.trim() || null, snippet: input.snippet?.trim() || null,
    taskIds: [...new Set(input.taskIds)], discoveries: [discovery], status: "UNREAD", documentId: null, evidenceIds: [], reason: null,
    tier: 0, priorityReason: "待按覆盖缺口排序；搜索摘要仅用于发现。", expectedSource };
  audit.candidates.push(candidate); return candidate;
}

/** Lexicographic tiers; cost never offsets a mandatory unanswered requirement. */
export function rankCandidates(audit: ResearchAudit): ResearchCandidate[] {
  const readHosts = new Set(audit.candidates.filter(item => item.status === "READ").map(item => new URL(item.url).hostname));
  const tasks = new Map(audit.tasks.map(task => [task.id, task]));
  const score = (candidate: ResearchCandidate) => {
    const related = candidate.taskIds.map(id => tasks.get(id)).filter((task): task is ResearchTask => !!task);
    const unmet = related.some(task => task.required && ["UNATTEMPTED", "SEARCHED", "GAP", "PARTIAL"].includes(task.status));
    const disputed = related.some(task => task.status === "DISPUTED");
    const unattempted = related.some(task => !task.evidenceIds.length && task.required && ["UNATTEMPTED", "SEARCHED"].includes(task.status));
    candidate.tier = unmet ? 0 : disputed ? 1 : 2;
    const need = related.some(task => task.evidenceNeed === "USE_REPORT" || task.evidenceNeed === "COUNTEREXAMPLE");
    const sourceMatch = need ? ["REPORT", "DISCUSSION"].includes(candidate.expectedSource) : candidate.expectedSource === "OFFICIAL";
    const freshHost = !readHosts.has(new URL(candidate.url).hostname);
    candidate.priorityReason = `层${candidate.tier}：${unattempted ? "关键方向尚未读；" : ""}${need ? "需要任务/过程/结果实测；" : "需要原始事实；"}${sourceMatch ? "来源类型匹配；" : ""}${freshHost ? "新增站点线索，不等同独立证据。" : "同站点，仍须检查作者/上游。"}`;
    return [candidate.tier, unattempted ? 0 : 1, sourceMatch ? 0 : 1, freshHost ? 0 : 1];
  };
  return audit.candidates.filter(candidate => candidate.status === "UNREAD").map(candidate => ({ candidate, key: score(candidate) })).sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i]! - b.key[i]!;
    return 0;
  }).map(item => item.candidate);
}

export function addSearchResults(audit: ResearchAudit, record: RetrievalRecord, taskIds: string[]) {
  for (const source of record.returnedSources) discoverCandidate(audit, { url: source.url, title: source.title, snippet: source.snippet, taskIds, recordId: record.id });
  for (const task of audit.tasks.filter(item => taskIds.includes(item.id))) {
    task.attempts++;
    if (task.status === "UNATTEMPTED") task.status = "SEARCHED";
    task.explanation = record.status === "SUCCEEDED" ? "已实际搜索，摘要不是证据；等待原文核查。" : `实际检索失败：${record.error}`;
  }
}

export function updateCoverage(audit: ResearchAudit, snapshot: EvidenceSnapshot, assignments: { taskId: string; claimIds: string[]; explanation: string }[]) {
  const before = new Map(audit.tasks.map(task => [task.id, `${task.status}:${task.claimIds.join(",")}`]));
  for (const task of audit.tasks) {
    const assignment = assignments.find(item => item.taskId === task.id);
    if (!assignment) continue;
    task.claimIds = [...new Set(assignment.claimIds.filter(id => snapshot.claims.some(claim => claim.id === id)))];
    const relevantClaims = snapshot.claims.filter(claim => task.claimIds.includes(claim.id));
    task.evidenceIds = [...new Set(snapshot.relations.filter(relation => task.claimIds.includes(relation.claimId) && ["SUPPORTS", "REFUTES"].includes(relation.relation)).map(relation => relation.evidenceId))];
    const needReports = task.evidenceNeed === "USE_REPORT" || task.evidenceNeed === "COUNTEREXAMPLE";
    const needOfficial = task.evidenceNeed === "OFFICIAL";
    const acceptable = (!needReports || relevantClaims.some(claim => claim.kind === "USER_REPORT")) && (!needOfficial || task.evidenceIds.some(id => snapshot.evidence.some(item => item.id === id && item.metadata.sourceType === "OFFICIAL")));
    const hasReadAttempt = audit.actions.some(action => action.kind === "READ" && action.taskIds.includes(task.id));
    task.status = relevantClaims.some(claim => claim.verificationStatus === "DISPUTED") ? "DISPUTED" : relevantClaims.length && relevantClaims.every(claim => claim.verificationStatus === "SUPPORTED") && acceptable ? "SUPPORTED" : task.evidenceIds.length ? "PARTIAL" : hasReadAttempt ? "GAP" : task.attempts ? "SEARCHED" : "UNATTEMPTED";
    task.explanation = assignment.explanation;
  }
  const root = audit.tasks[0]!;
  const required = audit.tasks.filter(task => task.id !== root.id && task.required);
  if (required.length) {
    root.claimIds = [...new Set(required.flatMap(task => task.claimIds))];
    root.evidenceIds = [...new Set(required.flatMap(task => task.evidenceIds))];
    root.status = required.every(task => task.status === "SUPPORTED") ? "SUPPORTED" : required.some(task => task.status === "DISPUTED") ? "DISPUTED" : root.evidenceIds.length ? "PARTIAL" : "GAP";
    root.explanation = `用户必答项${required.filter(task => task.status === "SUPPORTED").length}/${required.length}有已核验支持；未答项保持在账本。`;
  }
  return audit.tasks.filter(task => before.get(task.id) !== `${task.status}:${task.claimIds.join(",")}`).map(task => `${task.id}:${task.status}`);
}

export function recommendationPolicy(evidence: Evidence[]): ResearchAudit["recommendation"] {
  const reports = evidence.filter(item => item.readStatus === "READ" && item.metadata.contentKind === "USER_REPORT" && item.metadata.independence === "INDEPENDENT" && item.metadata.independenceReason);
  const groups = new Set(reports.map(item => item.metadata.originGroupId ?? item.sourceUrl));
  const sites = [...new Set(reports.map(item => new URL(item.sourceUrl).hostname.replace(/^www\./, "")))];
  return { eligible: groups.size >= 3 && sites.length >= 2, independentReports: groups.size, sites,
    reason: groups.size >= 3 && sites.length >= 2 ? "至少3组已确认独立真实使用报告且跨2站点；仍需用途/条件核查。" : "正式用途推荐至少需3组已确认独立真实使用报告并跨2站点；未知独立性不计数，仍可提供客观事实与限定分析。" };
}
