import { NewInvestigationForm } from "@/components/investigation/NewInvestigationForm";
import styles from "@/components/investigation/workbench.module.css";

export default function Home() {
  return <div className={styles.home}>
    <div className={styles.homeGrid}>
      <section className={styles.cover} aria-labelledby="cover-title">
        <p className={styles.kicker}>案卷 · AI PRODUCT DOSSIER</p>
        <h1 id="cover-title" className={styles.heroTitle}><span>把结论，</span><span>放回<mark>原文</mark>。</span></h1>
        <p className={styles.coverIntro}>查清 AI 产品的版本、套餐和不同说法，<br className={styles.desktopBreak} />让每个回答都有可核对的依据。</p>
        <span aria-hidden="true" className={styles.watermark}>原</span>
      </section>
      <section className={styles.composer} aria-label="发起产品调查">
        <p className={styles.kicker}>从一个具体问题开始</p>
        <div className={styles.serviceNote}><span aria-hidden="true" className={styles.serviceDot} /><div><strong>真实检索服务尚未接入</strong><p>当前为本地开发版本。任务执行时会明确记录服务不可用，不会生成模拟答案。</p></div></div>
        <NewInvestigationForm />
      </section>
      <aside className={styles.specimen} aria-label="能力示意，非调查结果">
        <div className={styles.specimenHead}><span>案卷编号 · 示例</span><span>阅读结构</span></div>
        <h2>一个回答，如何有据可查？</h2>
        <p className={styles.sampleQuestion}>问题 → 回答 → 对应原句 → 来源</p>
        <blockquote><mark>在这里查看回答所引用的精确原句。</mark></blockquote>
        <div className={styles.specimenFoot}><span>原文与译文分开保留</span><span>能力示意，非调查结果</span></div>
      </aside>
    </div>
    <div className={styles.homeFoot}>
      <ul className={styles.trustStrip}>{["每条回答附引用", "原句可回跳核对", "快照留档"].map((text) => <li key={text}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="m5 12 4 4L19 6" /></svg>{text}</li>)}</ul>
      <p className={styles.meta}>从问题出发，以原文为据。</p>
    </div>
  </div>;
}
