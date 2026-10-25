import { SnapshotResponseSchema, type SnapshotResponse } from "@/contracts";
import { AnswerBody } from "./AnswerBody";
import { citationAnchor, resultAnchor } from "./result-links";
import { CONTENT_LABELS, GAP_LABELS, SOURCE_LABELS, formatTime, READ_LABELS, RELATION_LABELS, VERIFICATION_LABELS } from "./labels";
import styles from "./workbench.module.css";

export function SnapshotView({ data }: { data: SnapshotResponse }) {
  // Also protects reuse outside InvestigationDetail. Never salvage broken mappings.
  const validated = SnapshotResponseSchema.safeParse(data);
  if (!validated.success) return <section className={styles.panel} role="alert"><h2>调查结果无法展示</h2><p>结果数据或引用映射未通过共享契约校验。请刷新后重试，并将问题交给数据提供方核对；未用其他来源替换。</p></section>;
  const { snapshot, answers } = validated.data;
  const anchor = (kind: string, id: string) => resultAnchor(snapshot.id, kind, id);
  const section = (name: string) => anchor("section", name);
  const evidenceIndex = new Map(snapshot.evidence.map((item, index) => [item.id, index + 1]));
  const claimIndex = new Map(snapshot.claims.map((item, index) => [item.id, index + 1]));
  const evidenceLink = (id: string) => <a className={styles.resultLink} href={`#${anchor("evidence", id)}`} key={id}>来源 {evidenceIndex.get(id)}</a>;
  const claimLink = (id: string) => <a className={styles.resultLink} href={`#${anchor("claim", id)}`} key={id}>主张 {claimIndex.get(id)}</a>;
  const citations = answers.flatMap((answer) => answer.citations.map((citation, index) => ({ answer, citation, index })));
  const insufficient = snapshot.claims.filter((claim) => claim.verificationStatus === "INSUFFICIENT");
  return <div className={`${styles.results} ${styles.resultDocument}`}>
    <nav className={styles.resultNav} aria-label="调查结果阅读导航">
      <p className={styles.indexTitle}>阅读目录</p>
      {[["answer", "调查回答"], ["claims", "主张核查"], ["sources", "引用与来源原文"], ["limits", "冲突和证据缺口"], ["info", "快照信息"]].map(([key, title]) => <a className={styles.resultLink} key={key} href={`#${section(key!)}`}>{title}</a>)}
    </nav>
    <section id={section("answer")} tabIndex={-1} className={styles.resultSection}>
      <span className={styles.sectionKicker} aria-hidden="true">壹</span>
      <h2>调查回答</h2>
      <p className={styles.meta}>调查对象：{snapshot.productIdentity.name} · 产品版本：{snapshot.productIdentity.version ?? "未知"} · 套餐：{snapshot.productIdentity.plan ?? "未知"}</p>
      {!answers.length && <p className={styles.empty}>该快照尚未保存回答。下方证据与主张记录不等于已经生成结论。</p>}
      {answers.map((answer, index) => <article key={answer.id} id={anchor("answer", answer.id)} tabIndex={-1} className={styles.answer}>
        <h3>回答 {index + 1}</h3>
        <p className={styles.meta}>回答生成于 {formatTime(answer.generationConfig.generatedAt)}</p>
        <AnswerBody answer={answer} snapshotId={snapshot.id} />
        {!answer.citations.length && <p className={styles.muted}>此回答未保存引用映射，无法从正文追溯引用来源。</p>}
        {!!answer.citations.length && <p className={styles.meta}><a className={styles.resultLink} href={`#${section("sources")}`}>核对引用映射与原文</a> · <a className={styles.resultLink} href={`#${section("claims")}`}>查看主张核查</a></p>}
      </article>)}
    </section>
    <section id={section("claims")} tabIndex={-1} className={styles.resultSection}>
      <span className={styles.sectionKicker} aria-hidden="true">贰</span>
      <h2>主张核查</h2><p className={styles.muted}>核查状态、理由和适用范围来自保存的记录。来源存在不代表主张已得到证明。</p>
      {!snapshot.claims.length && <p className={styles.empty}>该快照没有主张记录，无法展示逐条核查判断。</p>}
      {snapshot.claims.map((claim, index) => {
        const relations = snapshot.relations.filter((item) => item.claimId === claim.id);
        const gaps = snapshot.gaps.filter((item) => item.claimIds.includes(claim.id));
        const conflicts = snapshot.conflicts.filter((item) => item.claimIds.includes(claim.id));
        return <article id={anchor("claim", claim.id)} key={claim.id} tabIndex={-1} className={styles.evidence} data-verification={claim.verificationStatus}>
          <div className={styles.sectionHead}><h3>主张 {index + 1} · {claim.statement}</h3><span className={styles.status}>{VERIFICATION_LABELS[claim.verificationStatus]}</span></div>
          <p className={styles.meta}>主张类型：{CONTENT_LABELS[claim.kind]}</p>
          {claim.kind === "OFFICIAL_CLAIM" && <p className={styles.muted}>这是官方宣称，不因发布者为官方而自动具有独立验证效力。</p>}
          <p className={styles.prose}>核查理由：{claim.verificationReason}</p>
          <p className={styles.prose}>适用范围：{claim.scope ?? "未知（未记录适用范围）"}</p>
          <h4>关联证据</h4>
          {!relations.length && <p className={styles.muted}>未保存此主张的证据关系，不能据来源列表推定支持。</p>}
          {relations.map((relation) => <p className={styles.prose} key={relation.evidenceId}>{evidenceLink(relation.evidenceId)} · {RELATION_LABELS[relation.relation]}：{relation.reason}</p>)}
          <h4>尚存限制与冲突记录</h4>
          {!gaps.length && !conflicts.length && <p className={styles.muted}>未记录与此主张关联的缺口或冲突；不代表不存在限制。适用范围仍以上述记录为准。</p>}
          {gaps.map((gap) => <p key={gap.id} className={styles.prose}><a className={styles.resultLink} href={`#${anchor("gap", gap.id)}`}>{GAP_LABELS[gap.kind]}</a>：{gap.description}</p>)}
          {conflicts.map((conflict) => <p key={conflict.id} className={styles.prose}><a className={styles.resultLink} href={`#${anchor("conflict", conflict.id)}`}>{conflict.resolution === null ? "尚未解决的冲突" : "已记录处理说明的冲突"}</a>：{conflict.description}</p>)}
        </article>;
      })}
    </section>
    <section id={section("sources")} tabIndex={-1} className={styles.resultSection}>
      <span className={styles.sectionKicker} aria-hidden="true">叁</span>
      <h2>引用与来源原文</h2>
      <p className={styles.muted}>引用沿用本快照保存的映射。原文、译文和核查判断分别保留；没有读取原文的来源不能作为原句引用。</p>
      {!citations.length && <p className={styles.empty}>该快照的回答没有引用映射。</p>}
      {!!citations.length && <div className={styles.citationDetails} aria-label="引用映射"><h3>引用映射（{citations.length} 条）</h3>
        {citations.map(({ answer, citation, index }) => <article key={`${answer.id}-${index}`} id={citationAnchor(snapshot.id, answer.id, index)} tabIndex={-1} className={styles.evidence}>
          <h4>回答 {answers.indexOf(answer) + 1} · 引用 {citation.marker}</h4>
          <p>对应主张：{citation.claimIds.map(claimLink)}</p>
          <p>对应原文：{citation.evidenceIds.map(evidenceLink)}</p>
          {!citation.quotes && <p className={styles.meta}>此历史回答未单独保存引用原句；可沿已保存映射查看来源原文。</p>}
          <a className={styles.resultLink} href={`#${anchor("answer", answer.id)}`}>返回回答 {answers.indexOf(answer) + 1}</a>
        </article>)}
      </div>}
      <h3>来源记录 · {snapshot.evidence.length} 条</h3>
      {!snapshot.evidence.length && <p className={styles.empty}>该快照没有证据记录，不能据此推断没有相关讨论。</p>}
      {snapshot.evidence.map((evidence, index) => <article id={anchor("evidence", evidence.id)} key={evidence.id} tabIndex={-1} className={styles.evidence} data-kind={evidence.metadata.contentKind} data-read={evidence.readStatus}>
        <div className={styles.sectionHead}><h3>来源 {index + 1} · {evidence.metadata.title ?? "名称未知"}</h3><span className={styles.status}>{READ_LABELS[evidence.readStatus]}</span></div>
        <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className={`${styles.sourceLink} ${styles.resultLink}`}>{evidence.sourceUrl}</a>
        <dl className={styles.sourceMetadata}>
          <div><dt>网站／作者</dt><dd>{evidence.metadata.siteName ?? "未知"} ／ {evidence.metadata.author ?? "未知"}</dd></div>
          <div><dt>来源／内容性质</dt><dd className={styles.contentKind}>{SOURCE_LABELS[evidence.metadata.sourceType]} ／ {CONTENT_LABELS[evidence.metadata.contentKind]}</dd></div>
          <div><dt>发布时间</dt><dd>{evidence.metadata.publishedAt ? formatTime(evidence.metadata.publishedAt) : "未知"}</dd></div>
          <div><dt>获取时间</dt><dd>{formatTime(evidence.retrievedAt)}</dd></div>
          <div><dt>适用版本／套餐</dt><dd>{evidence.metadata.productVersion ?? "未知"} ／ {evidence.metadata.plan ?? "未知"}</dd></div>
          <div><dt>原文语言</dt><dd>{evidence.metadata.language ?? "未知"}</dd></div>
        </dl>
        {evidence.metadata.sourceType === "OFFICIAL" && <p className={styles.muted}>此来源为官方材料，其来源身份不等于独立核查；内容性质按上方已保存分类展示。</p>}
        {evidence.metadata.contentKind === "OFFICIAL_CLAIM" && <p className={styles.muted}>此处是官方宣称，不自动视为第三方实测或普遍事实。</p>}
        <h4>原文摘录</h4>
        {evidence.readStatus === "READ" ? <blockquote>{evidence.originalExcerpt}</blockquote> : <p className={styles.muted}>未取得可引用原文：{READ_LABELS[evidence.readStatus]}。{evidence.readStatus === "SNIPPET_ONLY" ? "搜索摘要不作为已读原文。" : "未生成替代原句。"}</p>}
        <h4>译文</h4>
        <p className={styles.prose}>{evidence.readStatus === "READ" ? evidence.translation ?? "未提供译文" : "原文未成功读取，不提供译文"}</p>
        <p className={styles.prose}>原文定位：{evidence.originalLocation ? `${({ TEXT: "文本", COMMENT: "评论", PAGE: "页码", TIMECODE: "时间码" })[evidence.originalLocation.kind]} · ${evidence.originalLocation.locator}` : "未知（未保存定位）"}</p>
        <p className={styles.prose}>定位上下文：{evidence.originalLocation?.context ?? "未知"}</p>
        {evidence.readStatus !== "READ" && <p className={styles.prose}>读取说明：{evidence.readError ?? "未知（未保存读取说明）"}</p>}
        <h4>来源独立性</h4>
        <p>{({ UNKNOWN: "未知（尚未确认）", INDEPENDENT: "已保存判断：独立来源", SHARED_ORIGIN: "已保存判断：共用上游来源" })[evidence.metadata.independence]}</p>
        <p className={styles.prose}>判断理由：{evidence.metadata.independenceReason ?? "未知（未记录判断理由）"}</p>
        {evidence.metadata.independence === "SHARED_ORIGIN" && <p className={styles.muted}>共享上游材料不能因页面数量增加而视为多份独立支持。来源组：<code>{evidence.metadata.originGroupId}</code></p>}
        {evidence.metadata.upstreamUrl ? <a href={evidence.metadata.upstreamUrl} className={styles.resultLink} target="_blank" rel="noopener noreferrer">查看已记录的上游来源</a> : <p className={styles.meta}>上游来源链接：未知</p>}
        <p>关联主张：{snapshot.relations.some((relation) => relation.evidenceId === evidence.id) ? snapshot.relations.filter((relation) => relation.evidenceId === evidence.id).map((relation) => claimLink(relation.claimId)) : "未记录"}</p>
        <div className={styles.references}>引用此来源：{citations.filter(({ citation }) => citation.evidenceIds.includes(evidence.id)).map(({ answer, citation, index: citationIndex }) => <a className={styles.resultLink} key={`${answer.id}-${citationIndex}`} href={`#${anchor("answer", answer.id)}`}>回答 {answers.indexOf(answer) + 1} · {citation.marker}</a>)}{!citations.some(({ citation }) => citation.evidenceIds.includes(evidence.id)) && "未被回答引用"}</div>
      </article>)}
    </section>
    <section id={section("limits")} tabIndex={-1} className={styles.resultSection}>
      <span className={styles.sectionKicker} aria-hidden="true">肆</span>
      <h2>冲突和证据缺口</h2>
      <h3>证据冲突</h3>
      {!snapshot.conflicts.length && <p className={styles.muted}>本快照未记录冲突；不代表所有来源一致。</p>}
      {snapshot.conflicts.map((conflict) => <article id={anchor("conflict", conflict.id)} tabIndex={-1} className={styles.evidence} key={conflict.id}><h4>{conflict.resolution === null ? "尚未解决的冲突" : "已有处理说明的冲突"}</h4><p className={styles.prose}>{conflict.description}</p><p className={styles.prose}>处理说明：{conflict.resolution ?? "尚未解决"}</p><p>涉及主张：{conflict.claimIds.map(claimLink)}</p><p>涉及来源：{conflict.evidenceIds.map(evidenceLink)}</p></article>)}
      <h3>证据不足的主张</h3>
      {insufficient.length ? <p>{insufficient.map((claim) => claimLink(claim.id))}</p> : <p className={styles.muted}>未记录核查状态为“证据不足”的主张，不代表不存在其他未知信息。</p>}
      <h3>已保存的证据缺口</h3>
      {!snapshot.gaps.length && <p className={styles.muted}>本快照未记录证据缺口；不代表不存在未知信息。</p>}
      {snapshot.gaps.map((gap) => <article id={anchor("gap", gap.id)} tabIndex={-1} className={styles.evidence} key={gap.id}><h4>{GAP_LABELS[gap.kind]}</h4><p className={styles.prose}>{gap.description}</p><p className={styles.prose}>记录的检索范围：{gap.searchScope ?? "未知（未记录范围）"}</p><p>关联主张：{gap.claimIds.length ? gap.claimIds.map(claimLink) : "未关联具体主张"}</p></article>)}
      <h3>原文未取得的来源</h3>
      {snapshot.evidence.some((evidence) => evidence.readStatus !== "READ") ? snapshot.evidence.filter((evidence) => evidence.readStatus !== "READ").map((evidence) => <p key={evidence.id}>{evidenceLink(evidence.id)} · {READ_LABELS[evidence.readStatus]}：{evidence.readError ?? "未记录原因"}</p>) : <p className={styles.muted}>当前来源记录中没有未读原文项；这不说明检索范围外的来源也已读取。</p>}
      <p className={styles.meta}>“未知”表示记录未提供相关信息，不能据此判断为“不适用”或“不存在”。</p>
    </section>
    <section id={section("info")} tabIndex={-1} className={styles.resultSection}>
      <span className={styles.sectionKicker} aria-hidden="true">伍</span>
      <h2>快照版本与生成信息</h2>
      <dl className={styles.sourceMetadata}>
        <div><dt>快照版本</dt><dd>{snapshot.version}</dd></div><div><dt>快照生成时间</dt><dd>{formatTime(snapshot.generatedAt)}</dd></div>
        <div><dt>快照 ID</dt><dd><code>{snapshot.id}</code></dd></div><div><dt>调查 ID</dt><dd><code>{snapshot.investigationId}</code></dd></div>
        <div><dt>父快照 ID</dt><dd>{snapshot.parentSnapshotId ? <code>{snapshot.parentSnapshotId}</code> : "无（首版快照）"}</dd></div><div><dt>契约版本</dt><dd>{snapshot.contractVersion}</dd></div>
      </dl>
      <p className={styles.muted}>此处是生成时保存的记录。当前执行状态与读取错误以上方调查状态区为准。</p>
      {!!answers.length && <details><summary>回答生成信息</summary>{answers.map((answer, index) => <p key={answer.id}>回答 {index + 1} · {formatTime(answer.generationConfig.generatedAt)} · {answer.generationConfig.provider} / {answer.generationConfig.model} · 提示版本 {answer.generationConfig.promptVersion}</p>)}</details>}
      <a className={styles.resultLink} href={`#${section("answer")}`}>返回调查回答</a>
    </section>
  </div>;
}
