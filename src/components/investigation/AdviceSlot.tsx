import type { Advice } from "@/contracts";
import styles from "./workbench.module.css";

/** Data-only integration slot. Enable only after a real advice API is available. */
export function AdviceSlot({ enabled = false, advice = null }: { enabled?: boolean; advice?: Advice | null }) {
  if (!enabled || !advice) return null;
  return <section className={styles.panel} aria-label="适配建议"><h2>适配建议</h2><p className={styles.meta}>适用场景：{advice.userConditions.useCase}</p><p className={styles.prose}>{advice.content}</p></section>;
}
