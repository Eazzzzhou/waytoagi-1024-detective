import type { ReactNode } from "react";
import type { Answer } from "@/contracts";
import { citationAnchor, resultAnchor } from "./result-links";
import styles from "./workbench.module.css";

/** Literal token matching only. No Markdown, HTML parsing or evidence inference. */
export function AnswerBody({ answer, snapshotId }: { answer: Answer; snapshotId: string }) {
  const markers = answer.citations.map((citation, index) => ({ citation, index })).sort((a, b) => b.citation.marker.length - a.citation.marker.length);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  while (cursor < answer.body.length) {
    let next: { offset: number; item: (typeof markers)[number] } | undefined;
    for (const item of markers) {
      const offset = answer.body.indexOf(item.citation.marker, cursor);
      if (offset !== -1 && (!next || offset < next.offset)) next = { offset, item };
    }
    if (!next) { nodes.push(answer.body.slice(cursor)); break; }
    nodes.push(answer.body.slice(cursor, next.offset));
    const { citation, index } = next.item;
    const target = citation.evidenceIds.length === 1 ? resultAnchor(snapshotId, "evidence", citation.evidenceIds[0]!) : citationAnchor(snapshotId, answer.id, index);
    nodes.push(<a key={next.offset} className={styles.inlineCitation} href={`#${target}`} aria-label={`引用 ${citation.marker}，${citation.evidenceIds.length === 1 ? "查看来源原文" : `查看 ${citation.evidenceIds.length} 条来源映射`}`}>{citation.marker}</a>);
    cursor = next.offset + citation.marker.length;
  }
  return <div className={`${styles.prose} ${styles.answerBody}`}>{nodes}</div>;
}
