/** Isolated UI materials. Never import into src/ or use as product investigation facts. */
import { randomUUID } from "node:crypto";
import { SnapshotResponseSchema } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "./snapshot";

export function makeReadingCase(investigationId?: string) {
  const snapshot = makeSnapshot(investigationId);
  snapshot.productIdentity.name = "隔离阅读验证对象（非产品结论）";
  const source = snapshot.evidence[0]!;
  source.metadata.title = "隔离材料：官方宣称";
  source.metadata.sourceType = "OFFICIAL"; source.metadata.contentKind = "OFFICIAL_CLAIM";
  source.metadata.independence = "SHARED_ORIGIN"; source.metadata.originGroupId = "test-origin-only";
  source.metadata.independenceReason = "隔离测试：与第二条来源共用上游，不能重复计数。";
  source.metadata.upstreamUrl = "https://example.com/test-upstream";
  source.translation = "隔离译文，仅验证原文与译文分离。";
  const second = structuredClone(source); second.id = randomUUID();
  second.sourceUrl = "https://example.com/isolated-long-url/" + "long-path-".repeat(100);
  second.metadata.title = "隔离材料：转述同一上游"; second.metadata.sourceType = "THIRD_PARTY";
  snapshot.evidence.push(second);
  const independent = structuredClone(source); independent.id = randomUUID();
  independent.metadata.title = "隔离材料：独立来源"; independent.metadata.sourceType = "COMMUNITY"; independent.metadata.contentKind = "USER_REPORT";
  independent.metadata.independence = "INDEPENDENT"; independent.metadata.independenceReason = "隔离测试保存的独立性判断，不是实际核验。";
  independent.metadata.originGroupId = null; independent.metadata.upstreamUrl = null;
  snapshot.evidence.push(independent);
  for (const status of ["FAILED", "RESTRICTED", "SNIPPET_ONLY", "NOT_FETCHED"] as const) {
    snapshot.evidence.push({ ...structuredClone(source), id: randomUUID(), originalExcerpt: null, translation: null, originalLocation: null, contentHash: null, readStatus: status, readError: ["FAILED", "RESTRICTED"].includes(status) ? `隔离读取状态：${status}` : null,
      metadata: { ...source.metadata, title: `隔离材料：${status}`, independence: "UNKNOWN", independenceReason: null, originGroupId: null, upstreamUrl: null } });
  }
  const claim = snapshot.claims[0]!;
  claim.statement = "隔离主张：不能把官方宣称直接当作独立实测。"; claim.kind = "OFFICIAL_CLAIM";
  claim.verificationStatus = "INSUFFICIENT"; claim.verificationReason = "仅用于核对关系展示，没有开展真实事实核查。";
  claim.scope = "仅限此隔离展示场景，不适用于任何真实产品判断。";
  snapshot.relations.push({ claimId: claim.id, evidenceId: second.id, relation: "UNCERTAIN", reason: "隔离映射：仍有分歧。" });
  snapshot.conflicts = [{ id: randomUUID(), claimIds: [claim.id], evidenceIds: [source.id, second.id], description: "隔离冲突：材料表述不一致，未作事实判断。", resolution: null }];
  snapshot.gaps = [
    { id: randomUUID(), claimIds: [claim.id], kind: "INSUFFICIENT_EVIDENCE", description: "隔离缺口：缺少独立实测。", searchScope: null },
    { id: randomUUID(), claimIds: [claim.id], kind: "NOT_FOUND_IN_SCOPE", description: "隔离缺口：限定范围内无可用证据。", searchScope: "仅检查这些隔离测试材料" },
    { id: randomUUID(), claimIds: [], kind: "READ_FAILED", description: "隔离缺口：原文读取失败。", searchScope: null }
  ];
  const answer = makeAnswer(snapshot);
  answer.body = "隔离阅读测试，不是产品调查结论。[1]\n\n第二段：不同来源需分别核对。[多源]\n<script>window.__unsafe = true</script>\n" + "长文本阅读测试：保留已保存信息，不扩写产品事实。\n".repeat(12);
  answer.citations.push({ marker: "[多源]", claimIds: [claim.id], evidenceIds: [source.id, second.id], quotes: [source, second].map((item) => ({ evidenceId: item.id, originalExcerpt: item.originalExcerpt! })) });
  return SnapshotResponseSchema.parse({ snapshot, answers: [answer] });
}
