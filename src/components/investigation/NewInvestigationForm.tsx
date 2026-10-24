"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AcceptedInvestigationSchema, CreateInvestigationSchema } from "@/contracts";
import { errorMessage, postJson, readApi } from "./api-client";
import styles from "./workbench.module.css";

export function NewInvestigationForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const submission = useRef<{ question: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = CreateInvestigationSchema.safeParse({ question });
    if (!parsed.success) { setError("请输入 1–4000 字的具体调查问题。"); return; }
    submitting.current = true; setBusy(true); setError(null);
    if (submission.current?.question !== parsed.data.question) submission.current = { question: parsed.data.question, key: crypto.randomUUID() };
    try {
      const result = await readApi("/api/investigations", AcceptedInvestigationSchema, {
        ...postJson(parsed.data), headers: { "Content-Type": "application/json", "Idempotency-Key": submission.current.key }
      });
      router.push(`/investigations/${result.investigationId}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className={styles.form}>
    <label htmlFor="question">你想核实什么？</label>
    <textarea id="question" name="question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={4000} required rows={6} disabled={busy} aria-describedby="question-help question-count" />
    <div className={styles.formFoot}><p id="question-help" className={styles.muted}>写明产品名称、具体问题，以及已知的版本或套餐。</p><span id="question-count" className={styles.meta}>{question.length} / 4000</span></div>
    {error && <p role="alert" className={styles.errorText}>{error}</p>}
    <button type="submit" disabled={busy} className={styles.primary}>{busy ? "正在提交…" : "创建调查"}</button>
    <p className={styles.meta}>提交后生成独立调查链接，可随时刷新查看。</p>
  </form>;
}
