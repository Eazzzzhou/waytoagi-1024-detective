import { NewInvestigationForm } from "@/components/investigation/NewInvestigationForm";
import styles from "@/components/investigation/workbench.module.css";

export default function Home() {
  return <>
    <header className={styles.titleRow}><div><h1>发起产品调查</h1><p className={styles.muted}>提出一个具体问题，让结论有据可查。</p></div></header>
    <div className={styles.homeGrid}>
      <section className={styles.panel}><NewInvestigationForm /></section>
      <aside className={styles.guide}><h2>从问题到依据</h2><p>关注产品的哪一项能力？先把范围说清楚，再核对对应的版本、套餐和来源。</p><h3>回答与引用</h3><p className={styles.muted}>回答关联证据，原文与译文分别保留。</p><h3>冲突与未知</h3><p className={styles.muted}>不同说法和未查清的部分会明确列出；读取失败不等于没有讨论。</p></aside>
    </div>
    <p className={styles.meta}>本地开发版本 · 真实检索服务尚未接入时，任务会明确记录不可用错误。</p>
  </>;
}
