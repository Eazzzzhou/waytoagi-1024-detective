import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./workbench.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#main">跳到主要内容</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.wordmark}><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h7l2 3h9v12H3z" /><path d="M7 12h10M7 16h7" /></svg>案卷</Link>
      <p className={styles.scope}>本地工作区</p>
      <nav aria-label="主导航"><Link href="/" className={styles.navLink}>发起调查 <span aria-hidden="true">＋</span></Link></nav>
      <div className={styles.sidebarNote}><p>AI 产品调查与证据核查</p><p>从具体问题出发，<br />把结论放回原文中核对。</p></div>
    </aside>
    <main id="main" className={styles.main}>{children}</main>
  </div>;
}
