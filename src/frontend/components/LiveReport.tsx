import type { ReactNode } from 'react'
import type { SnapshotResponse } from '../../contracts'
import { kinds, relations, verification } from '../lib/live-labels'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line py-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {children}
    </section>
  )
}

function Links({ claims, evidence }: { claims: string[]; evidence: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {claims.map((id, i) => (
        <a key={id} href={`#claim-${id}`} className="underline">
          主张 {i + 1}
        </a>
      ))}
      {evidence.map((id, i) => (
        <a key={id} href={`#evidence-${id}`} className="underline">
          来源 {i + 1}
        </a>
      ))}
    </div>
  )
}

export function Report({ data }: { data: SnapshotResponse }) {
  const { snapshot, answers } = data
  return (
    <>
      <p className="break-all text-xs text-ink-soft">
        快照 {snapshot.id} · 版本 {snapshot.version} · {snapshot.generatedAt} · 产品{' '}
        {snapshot.productIdentity.name}
      </p>
      <Section title="客观回答">
        {!answers.length && <p>当前快照没有保存客观回答。</p>}
        {answers.map((answer) => (
          <article key={answer.id} className="space-y-4">
            <p className="whitespace-pre-wrap leading-loose">{answer.body}</p>
            <p className="text-xs text-ink-soft">
              模型归纳 · {answer.generationConfig.provider} / {answer.generationConfig.model}
            </p>
            {answer.citations.map((citation) => (
              <details key={citation.marker} className="rounded-lg border border-line p-3">
                <summary className="cursor-pointer">{citation.marker} 查看依据与原句</summary>
                <div className="mt-3 space-y-3">
                  {citation.claimIds.map((id) => (
                    <a className="mr-3 inline-block underline" key={id} href={`#claim-${id}`}>
                      关联主张
                    </a>
                  ))}
                  {citation.evidenceIds.map((id) => (
                    <a className="mr-3 inline-block underline" key={id} href={`#evidence-${id}`}>
                      定位来源
                    </a>
                  ))}
                  {citation.quotes?.map((quote) => (
                    <blockquote key={quote.evidenceId} className="whitespace-pre-wrap border-l-2 border-seal pl-4">
                      原句：{quote.originalExcerpt}
                    </blockquote>
                  ))}
                  {!citation.quotes && <p>历史回答未保存逐条引用原句，请核对来源。</p>}
                </div>
              </details>
            ))}
          </article>
        ))}
      </Section>
      <Section title="主张与核查">
        {snapshot.claims.map((claim) => (
          <article
            key={claim.id}
            id={`claim-${claim.id}`}
            className="scroll-mt-24 space-y-2 rounded-lg border border-line p-4"
          >
            <p className="text-xs text-seal">
              {kinds[claim.kind]} · {verification[claim.verificationStatus]}
            </p>
            <h3 className="text-lg">{claim.statement}</h3>
            <p>{claim.verificationReason}</p>
            <p className="text-sm text-ink-soft">范围：{claim.scope ?? '未明确'}</p>
            {claim.kind === 'OFFICIAL_CLAIM' && (
              <p className="text-sm text-ink-soft">取得官方宣称的依据，不表示能力已获独立实测证实。</p>
            )}
            {snapshot.relations
              .filter((item) => item.claimId === claim.id)
              .map((item) => (
                <p key={item.evidenceId} className="text-sm">
                  <a className="underline" href={`#evidence-${item.evidenceId}`}>
                    {relations[item.relation]} · 查看来源
                  </a>
                  ：{item.reason}
                </p>
              ))}
          </article>
        ))}
      </Section>
      <Section title="冲突与缺口">
        {!snapshot.conflicts.length && !snapshot.gaps.length && (
          <p>未记录冲突或缺口，不代表已穷尽所有信息。</p>
        )}
        {snapshot.conflicts.map((conflict) => (
          <article key={conflict.id} className="space-y-2 rounded-lg border border-line p-4">
            <h3>{conflict.description}</h3>
            <p>处理：{conflict.resolution ?? '尚未解决'}</p>
            <Links claims={conflict.claimIds} evidence={conflict.evidenceIds} />
          </article>
        ))}
        {snapshot.gaps.map((gap) => (
          <article key={gap.id} className="space-y-2 rounded-lg border border-line p-4">
            <h3>{gap.claimIds.length ? '关联主张缺口' : '整体缺口／未关联具体主张'}</h3>
            <p>{gap.description}</p>
            <p className="text-sm text-ink-soft">检索范围：{gap.searchScope ?? '未明确'}</p>
            <Links claims={gap.claimIds} evidence={[]} />
          </article>
        ))}
      </Section>
      <Section title="来源与保存原文">
        <p className="text-sm text-ink-soft">
          来源独立性须结合具体主张、范围及上游判断；不按链接数计算独立支持。
        </p>
        {snapshot.evidence.map((item) => (
          <article
            key={item.id}
            id={`evidence-${item.id}`}
            className="scroll-mt-24 space-y-3 rounded-lg border border-line p-4"
          >
            <h3 className="text-lg">
              <a className="break-all underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
                {item.metadata.title ?? item.sourceUrl}
              </a>
            </h3>
            <p className="text-xs text-ink-soft">
              {item.readStatus === 'READ' ? '已读原文' : `未取得正文：${item.readStatus}`} · 获取{' '}
              {item.retrievedAt} · 作者 {item.metadata.author ?? '未知'}
            </p>
            {item.readStatus === 'READ' ? (
              <>
                <blockquote className="whitespace-pre-wrap border-l-2 border-seal pl-4">
                  原文：{item.originalExcerpt}
                </blockquote>
                <p className="text-sm">定位：{item.originalLocation?.locator}</p>
                {item.translation && <p className="whitespace-pre-wrap text-sm">译文：{item.translation}</p>}
              </>
            ) : (
              <p>{item.readError ?? '摘要或未抓取内容不作为原文依据。'}</p>
            )}
            <p className="text-sm">
              独立性：
              {item.metadata.independence === 'UNKNOWN'
                ? '未知，不计独立'
                : item.metadata.independence === 'SHARED_ORIGIN'
                  ? '共享上游'
                  : '该范围内判断为独立'}
              ；理由：{item.metadata.independenceReason ?? '未确定'}
            </p>
            <p className="break-all text-sm">
              上游：{item.metadata.upstreamUrl ?? '未知'} · 来源组：{item.metadata.originGroupId ?? '未知'} ·
              版本／套餐：{item.metadata.productVersion ?? '未知'}／{item.metadata.plan ?? '未知'}
            </p>
            <Links
              claims={snapshot.relations
                .filter((relation) => relation.evidenceId === item.id)
                .map((relation) => relation.claimId)}
              evidence={[]}
            />
          </article>
        ))}
        {snapshot.verificationAudit && (
          <p className="text-sm">
            第二模型复核：{snapshot.verificationAudit.review.status} ·{' '}
            {snapshot.verificationAudit.review.reason}
          </p>
        )}
      </Section>
    </>
  )
}
