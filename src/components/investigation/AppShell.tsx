import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./workbench.module.css";

/** 原创徽记：「案」字金环印章（档案馆钤印意象），非任何现有徽标的仿制。 */
function BrandSeal() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28" fill="none">
    <circle cx="14" cy="14" r="12.6" stroke="var(--gold)" strokeWidth="1.2" />
    <circle cx="14" cy="14" r="9.6" stroke="var(--gold)" strokeWidth="0.8" opacity="0.65" />
    <text x="14" y="18.1" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--ink)" fontFamily="Cormorant Garamond, Noto Serif SC, Georgia, Songti SC, STZhongsong, SimSun, serif">案</text>
  </svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#main">跳到主要内容</a>
    <header className={styles.sidebar}>
      <Link href="/" className={styles.wordmark}><BrandSeal />案卷</Link>
      <p className={styles.sidebarNote}>AI 产品调查与证据核查</p>
      <nav aria-label="主导航"><Link href="/#question" className={styles.navLink}>发起调查</Link></nav>
      <p className={styles.scope}>本地工作区</p>
    </header>
    <main id="main" tabIndex={-1} className={styles.main}>{children}</main>
  </div>;
}
