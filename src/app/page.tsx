import { NewInvestigationForm } from "@/components/investigation/NewInvestigationForm";
import { TempleScene } from "@/components/investigation/TempleScene";
import styles from "@/components/investigation/workbench.module.css";

export default function Home() {
  return <div className={styles.home}>
    <section className={styles.hero}>
      <p className={styles.heroKicker} aria-hidden="true"><span className={styles.sealBadge}>案</span></p>
      <h1 className={styles.heroTitle}>案卷</h1>
      <p className={styles.heroSub}>AI 产品调查与证据核查</p>
      <p className={styles.heroLead}>关于这款 AI 产品，你想查清什么？</p>
      <section className={styles.composer} aria-label="发起调查"><NewInvestigationForm /></section>
      <ol className={styles.steps} aria-label="调查阅读流程">
        <li className={styles.stepPill}><span className={styles.stepNo} aria-hidden="true">壹</span>提出问题</li>
        <li aria-hidden="true" className={styles.stepArrow}>→</li>
        <li className={styles.stepPill}><span className={styles.stepNo} aria-hidden="true">贰</span>查看真实状态</li>
        <li aria-hidden="true" className={styles.stepArrow}>→</li>
        <li className={styles.stepPill}><span className={styles.stepNo} aria-hidden="true">叁</span>沿引用复核</li>
      </ol>
      <p className={styles.homeNote}>本地开发版本 · 真实检索服务尚未接入时，任务会明确记录不可用错误。</p>
    </section>
    <div className={styles.scene} aria-hidden="true"><TempleScene /></div>
  </div>;
}
