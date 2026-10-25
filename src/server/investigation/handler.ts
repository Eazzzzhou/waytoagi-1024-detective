import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CONTRACT_VERSION, EvidenceSchema, EvidenceSnapshotSchema, IdSchema, ProductIdentitySchema, RetrievalRecordSchema, TextSchema, assertAnswerReferences,
  type Evidence, type EvidenceSnapshot, type InvestigationStage, type ProductIdentity, type RetrievalRecord } from "../../contracts";
import type { HandlerResult } from "../queue/contracts";
import { createCollectionProviders } from "../retrieval";
import { createVerificationProviders } from "../verification";
import { createModelProvider } from "../models";

export interface InvestigationContext {
  investigationId: string;
  question: string;
  confirmedIdentity: ProductIdentity | null;
  signal: AbortSignal;
  setStage(stage: Exclude<InvestigationStage, "COMPLETED">): Promise<void>;
}
export type InvestigationHandler = (context: InvestigationContext) => Promise<HandlerResult>;

type Collection = ReturnType<typeof createCollectionProviders>;
type Verification = ReturnType<typeof createVerificationProviders>;
const FollowupSchema = z.strictObject({ query: TextSchema.max(500).nullable(), claimIds: z.array(IdSchema), reason: TextSchema });

/** Shared runtime contracts at every boundary; only Worker publishes the returned result. */
export function createInvestigationHandler(dependencies: {
  collection?: (signal: AbortSignal, question: string, timeoutMs: number) => Collection;
  verification?: () => Verification;
  followupQueries?: 0 | 1;
} = {}): InvestigationHandler {
  const collectionFactory = dependencies.collection ?? ((signal, question, timeoutMs) => createCollectionProviders({ signal, question, timeoutMs, maxSources: 6 }));
  return async (context) => {
    context.signal.throwIfAborted();
    await context.setStage("IDENTITY");
    const collection = collectionFactory(context.signal, context.question, 60000);
    const identity = ProductIdentitySchema.parse(context.confirmedIdentity ?? await collection.resolve(context.question));
    if (identity.confirmationStatus !== "CONFIRMED") return {
      kind: "AWAITING_CONFIRMATION", request: { identity: { ...identity, confirmationStatus: "NEEDS_CONFIRMATION" }, reason: "请确认产品的官方身份与实际依据；当前材料不足以唯一确认。版本、套餐未知时可留空。" }
    };
    const verification = dependencies.verification?.() ?? createVerificationProviders();
    const records: RetrievalRecord[] = [];
    const evidence: Evidence[] = [];
    const contextForSource = { question: context.question, officialWebsite: identity.officialWebsite };

    async function readRecords(provider: Collection, batch: RetrievalRecord[], maxReads: number) {
      const existing = new Map(evidence.map((item) => [item.sourceUrl, item]));
      const urls = [...new Set(batch.flatMap((record) => record.returnedSources.map((source) => source.url)))].filter((url) => !existing.has(url)).slice(0, maxReads);
      const read = await Promise.all(urls.map(async (url) => EvidenceSchema.parse(await provider.fetch(url, contextForSource))));
      for (const item of read) { evidence.push(item); existing.set(item.sourceUrl, item); }
      for (const record of batch) {
        for (const source of record.returnedSources) {
          const item = existing.get(source.url);
          if (item) {
            source.evidenceId = item.id;
            source.adoption = item.readStatus === "READ" ? "ADOPTED" : "REJECTED";
            source.adoptionReason = item.readStatus === "READ" ? "取得并保存原句；是否支持问题由后续逐主张核查决定，不按搜索排名确证。" : `来源原文不可用：${item.readStatus}。${item.readError ?? "尚未获取"}`;
          } else {
            source.adoption = "REJECTED";
            source.adoptionReason = "达到本轮原文读取预算；摘要未升级为原文证据。";
          }
        }
        records.push(RetrievalRecordSchema.parse(record));
      }
    }

    await context.setStage("RETRIEVAL");
    const first = await Promise.all([
      collection.search(context.question, identity), collection.searchWeb(context.question, identity),
      ...(/overseas|community|conflict|论坛|社区|海外|冲突|争议|评价/i.test(context.question) ? [collection.searchCommunity(`${identity.name} ${context.question}`, identity)] : [])
    ]);
    await context.setStage("SOURCE_FETCH");
    await readRecords(collection, first, 6);
    // The official identity basis is a real read from this run; retain it even if search is unavailable.
    for (const basis of identity.confirmationBasis) {
      if (evidence.some((item) => item.sourceUrl === basis.url && item.readStatus === "READ")) continue;
      if (evidence.length >= 8) break;
      evidence.push(EvidenceSchema.parse(await collection.fetch(basis.url, contextForSource)));
    }
    context.signal.throwIfAborted();
    await context.setStage("VERIFICATION");
    const claims = await verification.extraction.extract(evidence, identity, { question: context.question, signal: context.signal });
    let snapshot: EvidenceSnapshot = EvidenceSnapshotSchema.parse({
      id: randomUUID(), investigationId: context.investigationId, version: 1, parentSnapshotId: null,
      productIdentity: identity, evidence, claims, relations: [], conflicts: [],
      gaps: [
        ...evidence.filter((item) => item.readStatus !== "READ").map((item) => ({ id: randomUUID(), claimIds: [], kind: item.readStatus === "NOT_FETCHED" || item.readStatus === "SNIPPET_ONLY" ? "NOT_FETCHED" : "READ_FAILED", description: `${item.sourceUrl}：${item.readStatus}；${item.readError ?? "未取得可核验原句"}`, searchScope: null })),
        ...records.filter((record) => record.status === "FAILED").map((record) => ({ id: randomUUID(), claimIds: [], kind: "INSUFFICIENT_EVIDENCE", description: `${record.provider} 检索失败：${record.error}；不表示没有相关材料。`, searchScope: record.query }))
      ],
      retrievalRecords: records, generatedAt: new Date().toISOString(), contractVersion: CONTRACT_VERSION
    });
    snapshot = await verification.verification.verify(snapshot, { question: context.question, signal: context.signal });
    const unresolved = snapshot.claims.filter((claim) => ["INSUFFICIENT", "DISPUTED"].includes(claim.verificationStatus) || snapshot.gaps.some((gap) => ["NOT_FETCHED", "INSUFFICIENT_EVIDENCE"].includes(gap.kind) && gap.claimIds.includes(claim.id)));
    const maxQueries = dependencies.followupQueries ?? 1;
    verification.audit.followup = { queriesUsed: 0, maxQueries, stopReason: unresolved.length ? "待评估未决主张是否值得补查。" : "当前问题的主张已核查；不为增加来源数量继续检索。" };
    if (unresolved.length && maxQueries) {
      try {
      const plan = await createModelProvider({ onCall: (call) => verification.audit.modelCalls.push(call) }).generate({
        purpose: "bounded-followup-value-assessment", signal: context.signal, outputSchema: FollowupSchema,
        prompt: `仅当一次额外检索很可能解决影响回答的未决主张时返回query，否则null。不要为了凑平台数量或重复相同查询补查。缺授权/用户环境/实际运行条件不能靠搜索补齐。最多一次查询、最多2个原文；可使用英文查海外原始材料，但不能假设会有冲突。只能引用输入主张ID。JSON。${JSON.stringify({ question: context.question, identity, claims: unresolved, evidence: snapshot.evidence, gaps: snapshot.gaps, previousQueries: records.map((record) => record.query) })}`
      });
      if (plan.claimIds.some((id) => !unresolved.some((claim) => claim.id === id))) throw new Error("Follow-up plan references absent unresolved claim");
      verification.audit.followup.stopReason = plan.reason;
      if (plan.query && plan.claimIds.length && !records.some((record) => record.query === plan.query)) {
        const supplementary = collectionFactory(context.signal, context.question, 20000);
        const additions = await Promise.all([supplementary.search(plan.query, identity), supplementary.searchWeb(plan.query, identity)]);
        verification.audit.followup.queriesUsed = 1;
        await readRecords(supplementary, additions, 2);
        snapshot = EvidenceSnapshotSchema.parse({ ...snapshot, evidence, retrievalRecords: records });
        snapshot = await verification.verification.verify(snapshot, { question: context.question, signal: context.signal });
        verification.audit.followup.stopReason = `已达到一次补查预算；剩余缺口保留并完成回答。触发理由：${plan.reason}`;
      }
      } catch {
        context.signal.throwIfAborted();
        verification.audit.followup.stopReason = "可选补查达到预算或未成功；保留已有核查结果、失败与证据缺口，结束补查。";
        snapshot.gaps.push({ id: randomUUID(), claimIds: unresolved.map((claim) => claim.id), kind: "INSUFFICIENT_EVIDENCE", description: "本轮有限补查未取得可发布的新增核查结果；不解释为无相关材料。", searchScope: context.question });
      }
    } else if (unresolved.length) verification.audit.followup.stopReason = "补查预算为零；保留未决主张与缺口并完成回答。";
    await context.setStage("ANSWER");
    const answer = await verification.answer.generate(snapshot, { question: context.question, signal: context.signal });
    snapshot.generatedAt = new Date().toISOString();
    snapshot.verificationAudit = verification.audit;
    verification.audit.modelCalls.sort((first, second) => Date.parse(first.startedAt) - Date.parse(second.startedAt));
    context.signal.throwIfAborted();
    assertAnswerReferences(answer, snapshot);
    return { kind: "COMPLETE", result: { snapshot: EvidenceSnapshotSchema.parse(snapshot), answer } };
  };
}
export const investigationHandler = createInvestigationHandler();
