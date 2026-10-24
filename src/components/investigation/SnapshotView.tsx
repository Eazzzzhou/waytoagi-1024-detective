import type { SnapshotResponse } from "@/contracts";
import { formatTime, READ_LABELS, RELATION_LABELS, VERIFICATION_LABELS } from "./labels";
import styles from "./workbench.module.css";

export function SnapshotView({ data }: { data: SnapshotResponse }) {
  const { snapshot, answers } = data;
  const evidenceLabel = (id: string) => `来源 ${snapshot.evidence.findIndex((item) => item.id === id) + 1}`;
  return <div className={styles.results}>
    <section className={styles.panel}>
      <div className={styles.sectionHead}><h2>调查回答</h2><span className={styles.meta}>快照版本 {snapshot.version}</span></div>
      <p className={styles.meta}>生成于 {formatTime(snapshot.generatedAt)} · {snapshot.productIdentity.name} · 版本 {snapshot.productIdentity.version ?? "未知"} · 套餐 {snapshot.productIdentity.plan ?? "未知"}</p>
      {answers.length ? answers.map((answer) => <article key={answer.id} className={styles.answer}>
        <p className={styles.prose}>{answer.body}</p>
        <div className={styles.references} aria-label="回答引用">{answer.citations.map((citation) => <div key={citation.marker}>
          <span>{citation.marker} </span>{citation.evidenceIds.map((id) => <a href={`#evidence-${id}`} key={id}>{evidenceLabel(id)}</a>)}
          <span className={styles.meta}>对应主张 {citation.claimIds.map((id) => snapshot.claims.find((item) => item.id === id)?.statement).join("；")}</span>
        </div>)}</div>
        <p className={styles.meta}>生成配置：{answer.generationConfig.provider} / {answer.generationConfig.model} · 提示版本 {answer.generationConfig.promptVersion}</p>
      </article>) : <p className={styles.empty}>该快照尚未保存回答。</p>}
    </section>
    <section className={styles.panel}>
      <h2>来源与原文 <span className={styles.meta}>{snapshot.evidence.length} 条</span></h2>
      {!snapshot.evidence.length && <p className={styles.empty}>该快照没有证据记录。</p>}
      {snapshot.evidence.map((evidence, index) => <article id={`evidence-${evidence.id}`} key={evidence.id} className={styles.evidence}>
        <div className={styles.sectionHead}><h3>来源 {index + 1} · {evidence.metadata.title ?? evidence.metadata.siteName ?? "来源标题未知"}</h3><span className={styles.meta}>{READ_LABELS[evidence.readStatus]}</span></div>
        <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{evidence.sourceUrl}</a>
        <p className={styles.meta}>来源性质：{({ OFFICIAL: "官方材料", COMMUNITY: "社区材料", THIRD_PARTY: "第三方材料", UNKNOWN: "未知" })[evidence.metadata.sourceType]} · 内容：{({ FACT: "事实陈述", OFFICIAL_CLAIM: "官方宣称", USER_REPORT: "使用者报告", OPINION: "观点", UNKNOWN: "未知" })[evidence.metadata.contentKind]}</p>
        <p className={styles.meta}>作者：{evidence.metadata.author ?? "未知"} · 发布时间：{evidence.metadata.publishedAt ? formatTime(evidence.metadata.publishedAt) : "未知"} · 获取：{formatTime(evidence.retrievedAt)}</p>
        {evidence.originalExcerpt !== null && <><h4>原文</h4><blockquote>{evidence.originalExcerpt}</blockquote></>}
        {evidence.translation !== null && <><h4>译文</h4><p className={styles.prose}>{evidence.translation}</p></>}
        {evidence.originalLocation && <p className={styles.meta}>原文定位：{evidence.originalLocation.locator}{evidence.originalLocation.context ? ` · 上下文：${evidence.originalLocation.context}` : ""}</p>}
        {evidence.readError && <p>读取情况：{evidence.readError}</p>}
        <p className={styles.meta}>适用版本：{evidence.metadata.productVersion ?? "未知"} · 套餐：{evidence.metadata.plan ?? "未知"} · 来源独立性：{({ UNKNOWN: "尚未确认", INDEPENDENT: "已判为独立来源", SHARED_ORIGIN: "共用上游来源" })[evidence.metadata.independence]}</p>
        {evidence.metadata.independenceReason && <p className={styles.meta}>独立性依据：{evidence.metadata.independenceReason}</p>}
        {evidence.metadata.upstreamUrl && <a href={evidence.metadata.upstreamUrl} target="_blank" rel="noopener noreferrer">查看已记录的上游来源</a>}
      </article>)}
    </section>
    <section className={styles.panel}>
      <h2>主张与验证判断</h2>
      {!snapshot.claims.length && <p className={styles.empty}>该快照没有主张记录。</p>}
      {snapshot.claims.map((claim) => <article key={claim.id} className={styles.evidence}>
        <h3>{claim.statement}</h3><p>{VERIFICATION_LABELS[claim.verificationStatus]} · {claim.verificationReason}</p>
        {claim.scope && <p className={styles.meta}>适用范围：{claim.scope}</p>}
        {snapshot.relations.filter((relation) => relation.claimId === claim.id).map((relation) => <p key={relation.evidenceId}><a href={`#evidence-${relation.evidenceId}`}>{evidenceLabel(relation.evidenceId)}</a> · {RELATION_LABELS[relation.relation]}：{relation.reason}</p>)}
      </article>)}
    </section>
    <section className={styles.panel}>
      <h2>冲突与证据缺口</h2>
      {!snapshot.conflicts.length && <p className={styles.muted}>本快照未记录冲突。</p>}
      {snapshot.conflicts.map((conflict) => <article className={styles.evidence} key={conflict.id}><h3>冲突</h3><p>{conflict.description}</p><p>处理情况：{conflict.resolution ?? "尚未解决"}</p>{conflict.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{evidenceLabel(id)} </a>)}</article>)}
      {!snapshot.gaps.length && <p className={styles.muted}>本快照未记录证据缺口；不代表不存在未知信息。</p>}
      {snapshot.gaps.map((gap) => <article className={styles.evidence} key={gap.id}><h3>{({ NOT_FETCHED: "原文尚未取得", READ_FAILED: "来源读取失败", NOT_FOUND_IN_SCOPE: "限定范围内未找到", IDENTITY_UNCLEAR: "产品身份不明确", INSUFFICIENT_EVIDENCE: "证据不足" })[gap.kind]}</h3><p>{gap.description}</p>{gap.searchScope && <p className={styles.meta}>检索范围：{gap.searchScope}</p>}</article>)}
    </section>
  </div>;
}
