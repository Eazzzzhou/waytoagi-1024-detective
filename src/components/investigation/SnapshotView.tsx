"use client";
import { Fragment, useState, type ReactNode } from "react";
import type { Answer, Citation, SnapshotResponse } from "@/contracts";
import { formatTime, READ_LABELS, RELATION_LABELS, VERIFICATION_LABELS } from "./labels";
import styles from "./workbench.module.css";

const sourceTypes = { OFFICIAL: "官方材料", COMMUNITY: "社区材料", THIRD_PARTY: "第三方材料", UNKNOWN: "来源性质未知" };
const contentKinds = { FACT: "事实陈述", OFFICIAL_CLAIM: "官方宣称", USER_REPORT: "使用者报告", OPINION: "观点", UNKNOWN: "内容性质未知" };
const independenceLabels = { UNKNOWN: "尚未确认", INDEPENDENT: "已判为独立来源", SHARED_ORIGIN: "共用上游来源" };

/** Match exact markers longest first; all other content stays escaped React text. */
function citationParts(answer: Answer): (string | { citation: Citation; occurrence: number })[] {
  if (!answer.citations.length) return [answer.body];
  const markers = answer.citations.map((citation) => citation.marker).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(markers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const parts: (string | { citation: Citation; occurrence: number })[] = [];
  let position = 0;
  let occurrence = 0;
  for (const match of answer.body.matchAll(pattern)) {
    if (match.index > position) parts.push(answer.body.slice(position, match.index));
    parts.push({ citation: answer.citations.find((citation) => citation.marker === match[0])!, occurrence: occurrence++ });
    position = match.index + match[0].length;
  }
  parts.push(answer.body.slice(position));
  return parts;
}

export function SnapshotView({ data }: { data: SnapshotResponse }) {
  const { snapshot, answers } = data;
  const [returnTargets, setReturnTargets] = useState<Record<string, string>>({});
  const evidenceLabel = (id: string) => `来源 ${snapshot.evidence.findIndex((item) => item.id === id) + 1}`;
  const affectedClaims = (ids: string[]) => <div className={styles.claimLinks}><span>影响主张：</span>{ids.length ? ids.map((id) => {
    const claim = snapshot.claims.find((item) => item.id === id);
    return claim ? <a key={id} href={`#claim-${id}`}>{claim.statement}</a> : <span key={id}>关联由调查数据提供</span>;
  }) : <span>关联由调查数据提供</span>}</div>;
  const target = (citation: Citation, id: string) => {
    const evidence = snapshot.evidence.find((item) => item.id === id);
    const quote = citation.quotes?.find((item) => item.evidenceId === id);
    return quote && quote.originalExcerpt === evidence?.originalExcerpt ? `quote-${id}` : `evidence-${id}`;
  };
  const firstReferences: Record<string, string> = {};
  const bodies = answers.map((answer) => ({ answer, parts: citationParts(answer) }));
  for (const { answer, parts } of bodies) for (const part of parts) if (typeof part !== "string") {
    for (const id of part.citation.evidenceIds) firstReferences[id] ??= `ref-${answer.id}-${part.occurrence}-${id}`;
  }
  const link = (citation: Citation, id: string, key: string): ReactNode => <a key={id} href={`#${target(citation, id)}`} onClick={() => setReturnTargets((current) => ({ ...current, [id]: key }))}>{evidenceLabel(id)}</a>;
  return <div className={styles.results}>
    <nav className={styles.reportNav} aria-label="报告目录"><a href="#report-answer">调查回答</a><a href="#report-attention">冲突与缺口</a><a href="#report-sources">来源与原文</a><a href="#report-claims">主张验证</a></nav>
    <section className={styles.panel} id="report-answer">
      <div className={styles.sectionHead}><h2><span className={styles.sectionNumber}>01</span>调查回答</h2><span className={styles.meta}>快照版本 {snapshot.version}</span></div>
      <p className={styles.meta}>生成于 {formatTime(snapshot.generatedAt)} · {snapshot.productIdentity.name} · 版本 {snapshot.productIdentity.version ?? "未知"} · 套餐 {snapshot.productIdentity.plan ?? "未知"}</p>
      {bodies.length ? bodies.map(({ answer, parts }) => <article key={answer.id} className={styles.answer}>
        <p className={styles.prose}>{parts.map((part, index) => typeof part === "string" ? <Fragment key={index}>{part}</Fragment> : <span key={index}>{part.citation.evidenceIds.map((id) => {
          const anchor = `ref-${answer.id}-${part.occurrence}-${id}`;
          return <a key={id} id={anchor} className={styles.inlineCitation} href={`#${target(part.citation, id)}`} aria-label={`引用 ${part.citation.marker}，${evidenceLabel(id)}`} onClick={() => setReturnTargets((current) => ({ ...current, [id]: anchor }))}>{part.citation.marker}{part.citation.evidenceIds.length > 1 && <span>·{snapshot.evidence.findIndex((item) => item.id === id) + 1}</span>}</a>;
        })}</span>)}</p>
        <details className={styles.details}><summary>查看本回答的引用与原句 · {answer.citations.length} 组</summary>
          <div className={styles.references} aria-label="回答引用">{answer.citations.map((citation, index) => <div key={citation.marker} id={`citation-${answer.id}-${index}`}>
            <strong>{citation.marker} </strong>{citation.evidenceIds.map((id) => link(citation, id, `citation-${answer.id}-${index}`))}
            {citation.quotes?.map((quote) => <blockquote className={styles.citationQuote} key={quote.evidenceId}>{quote.originalExcerpt}</blockquote>)}
            {!citation.quotes && <p className={styles.meta}>历史回答未保存独立引用预览，请打开来源核对原文。</p>}
            <span className={styles.meta}>对应主张 {citation.claimIds.map((id) => snapshot.claims.find((item) => item.id === id)?.statement).join("；")}</span>
          </div>)}</div>
        </details>
      </article>) : <p className={styles.empty}>该快照尚未保存回答。</p>}
    </section>
    <section className={`${styles.panel} ${snapshot.conflicts.length || snapshot.gaps.length ? styles.attention : ""}`} id="report-attention">
      <h2><span className={styles.sectionNumber}>02</span>冲突与证据缺口</h2>
      {!snapshot.conflicts.length && <p className={styles.muted}>本快照未记录冲突。</p>}
      {snapshot.conflicts.map((conflict) => <article className={styles.evidence} key={conflict.id}><h3>冲突</h3><p>{conflict.description}</p><p>处理情况：{conflict.resolution ?? "尚未解决"}</p>{affectedClaims(conflict.claimIds)}{conflict.evidenceIds.map((id) => <a key={id} className={styles.sourceLink} href={`#evidence-${id}`}>{evidenceLabel(id)} </a>)}</article>)}
      {!snapshot.gaps.length && <p className={styles.muted}>本快照未记录证据缺口；不代表不存在未知信息。</p>}
      {snapshot.gaps.map((gap) => <article className={styles.evidence} key={gap.id}><h3>{({ NOT_FETCHED: "原文尚未取得", READ_FAILED: "来源读取失败", NOT_FOUND_IN_SCOPE: "限定范围内未找到", IDENTITY_UNCLEAR: "产品身份不明确", INSUFFICIENT_EVIDENCE: "证据不足" })[gap.kind]}</h3><p>{gap.description}</p>{affectedClaims(gap.claimIds)}{gap.searchScope && <p className={styles.meta}>检索范围：{gap.searchScope}</p>}</article>)}
    </section>
    <section className={styles.panel} id="report-sources">
      <h2><span className={styles.sectionNumber}>03</span>来源与原文 <span className={styles.meta}>{snapshot.evidence.length} 条来源记录</span></h2>
      <p className={styles.meta}>来源记录数量不等于独立证据数量，来源性质也不代表事实已经证实。</p>
      <section className={styles.sourceRelations} aria-label="来源关系"><h3>来源关系</h3>
        {!snapshot.evidence.length && <p className={styles.meta}>未知：暂无来源关系数据。</p>}
        <ul>{snapshot.evidence.map((evidence) => <li key={evidence.id}>
          <a href={`#evidence-${evidence.id}`}>{evidenceLabel(evidence.id)}</a>
          <span>上游：{evidence.metadata.upstreamUrl ? <a href={evidence.metadata.upstreamUrl} target="_blank" rel="noopener noreferrer">{evidence.metadata.upstreamUrl} ↗</a> : "未知"}</span>
          <span>同源：{evidence.metadata.independence === "SHARED_ORIGIN" ? <>数据标注共用上游来源 · 分组 <code>{evidence.metadata.originGroupId ?? "未知"}</code></> : "未知"}</span>
          {evidence.metadata.independence === "INDEPENDENT" && <span>独立性：数据标注为独立来源</span>}
        </li>)}</ul>
      </section>
      {!snapshot.evidence.length && <p className={styles.empty}>该快照没有证据记录。</p>}
      {snapshot.evidence.map((evidence, index) => <article id={`evidence-${evidence.id}`} key={evidence.id} className={styles.evidence}>
        <div className={styles.sectionHead}><h3>来源 {index + 1} · {evidence.metadata.title ?? evidence.metadata.siteName ?? "来源标题未知"}</h3><span className={styles.meta}>{READ_LABELS[evidence.readStatus]}</span></div>
        <p className={styles.meta}>{sourceTypes[evidence.metadata.sourceType]} · {contentKinds[evidence.metadata.contentKind]}</p>
        <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{evidence.metadata.siteName ?? new URL(evidence.sourceUrl).hostname} · 查看原始来源 ↗</a>
        {evidence.originalExcerpt !== null && <><h4>原文</h4><blockquote id={`quote-${evidence.id}`} tabIndex={-1}><mark>{evidence.originalExcerpt}</mark></blockquote></>}
        {evidence.translation !== null && <><h4>译文</h4><p className={styles.prose}>{evidence.translation}</p></>}
        {evidence.originalLocation && <p className={styles.meta}>原文定位：{evidence.originalLocation.locator}{evidence.originalLocation.context ? ` · 上下文：${evidence.originalLocation.context}` : ""}</p>}
        {evidence.readError && <p className={styles.errorText}>读取情况：{evidence.readError}</p>}
        {(returnTargets[evidence.id] || firstReferences[evidence.id]) && <a className={styles.sourceLink} href={`#${returnTargets[evidence.id] ?? firstReferences[evidence.id]}`}>↑ 返回回答引用</a>}
        <details className={styles.details}><summary>来源详情与独立性依据</summary>
          <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{evidence.sourceUrl}</a>
          <p className={styles.meta}>作者：{evidence.metadata.author ?? "未知"} · 发布时间：{evidence.metadata.publishedAt ? formatTime(evidence.metadata.publishedAt) : "未知"} · 获取：{formatTime(evidence.retrievedAt)}</p>
          <p className={styles.meta}>适用版本：{evidence.metadata.productVersion ?? "未知"} · 套餐：{evidence.metadata.plan ?? "未知"} · 来源独立性：{independenceLabels[evidence.metadata.independence]}</p>
          {evidence.metadata.independenceReason && <p className={styles.meta}>独立性依据：{evidence.metadata.independenceReason}</p>}
          {evidence.metadata.upstreamUrl && <a href={evidence.metadata.upstreamUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>查看已记录的上游来源</a>}
          <p className={styles.meta}>语言：{evidence.metadata.language ?? "未知"} · 上游分组：{evidence.metadata.originGroupId ?? "未知"}</p>
          <p className={styles.meta}>内容哈希：<code>{evidence.contentHash ?? "未保存"}</code></p>
        </details>
      </article>)}
    </section>
    <section className={styles.panel} id="report-claims">
      <h2><span className={styles.sectionNumber}>04</span>主张与验证判断</h2>
      {!snapshot.claims.length && <p className={styles.empty}>该快照没有主张记录。</p>}
      {snapshot.claims.map((claim) => <article id={`claim-${claim.id}`} key={claim.id} className={styles.evidence} tabIndex={-1}>
        <div className={styles.claimHead}><span className={styles.claimKind}>{contentKinds[claim.kind] ?? "未标注类型"}</span><h3>{claim.statement}</h3><span className={`${styles.verification} ${claim.verificationStatus === "DISPUTED" ? styles.disputed : ""}`}>{VERIFICATION_LABELS[claim.verificationStatus]}</span></div><p>{claim.verificationReason}</p>
        {claim.scope && <p className={styles.meta}>适用范围：{claim.scope}</p>}
        {snapshot.relations.filter((relation) => relation.claimId === claim.id).map((relation) => <p key={relation.evidenceId}><a className={styles.sourceLink} href={`#evidence-${relation.evidenceId}`}>{evidenceLabel(relation.evidenceId)}</a> · {RELATION_LABELS[relation.relation]}：{relation.reason}</p>)}
      </article>)}
      <details className={styles.details}><summary>生成与快照信息</summary>
        <p className={styles.meta}>快照 ID <code>{snapshot.id}</code> · 契约版本 <code>{snapshot.contractVersion}</code></p>
        <p className={styles.meta}>父快照 <code>{snapshot.parentSnapshotId ?? "无（初始快照）"}</code></p>
        <p className={styles.meta}>产品身份：{({ UNRESOLVED: "尚未确认", NEEDS_CONFIRMATION: "等待确认", CONFIRMED: "已确认" })[snapshot.productIdentity.confirmationStatus]}</p>
        {snapshot.productIdentity.officialWebsite && <a className={styles.sourceLink} href={snapshot.productIdentity.officialWebsite} target="_blank" rel="noopener noreferrer">产品官网 ↗</a>}
        {snapshot.productIdentity.confirmationBasis.map((basis, index) => <div key={index}><blockquote className={styles.citationQuote}>{basis.excerpt}</blockquote><a className={styles.sourceLink} href={basis.url} target="_blank" rel="noopener noreferrer">身份依据来源 ↗</a><p className={styles.meta}>{basis.reason} · {formatTime(basis.retrievedAt)}</p></div>)}
        {answers.map((answer) => <p className={styles.meta} key={answer.id}>生成配置：{answer.generationConfig.provider} / {answer.generationConfig.model} · 提示版本 {answer.generationConfig.promptVersion} · {formatTime(answer.generationConfig.generatedAt)} · 温度 {answer.generationConfig.temperature ?? "未记录"}</p>)}
        {snapshot.retrievalRecords.map((record) => <div className={styles.evidence} key={record.id}><h3>检索记录 · {record.status === "SUCCEEDED" ? "调用成功" : "调用失败"}</h3><p>{record.query}</p><p className={styles.meta}>{record.provider} · {formatTime(record.calledAt)}</p>{record.error && <p className={styles.errorText}>{record.error}</p>}{record.returnedSources.map((source, index) => <div key={index}><a className={styles.sourceLink} href={source.url} target="_blank" rel="noopener noreferrer">{source.title ?? source.url}</a><p className={styles.meta}>{({ PENDING: "待决定", ADOPTED: "已采用", REJECTED: "未采用" })[source.adoption]} · {source.adoptionReason ?? "未记录采用理由"}</p></div>)}</div>)}
      </details>
    </section>
  </div>;
}
