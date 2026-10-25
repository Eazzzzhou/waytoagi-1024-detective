"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AcceptedInvestigationSchema, CreateInvestigationSchema } from "@/contracts";
import { errorMessage, postJson, readApi } from "./api-client";
import styles from "./workbench.module.css";
import { useRequestAction } from "./use-request-action";

export function NewInvestigationForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const { busy, run } = useRequestAction();
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const submission = useRef<{ question: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const parsed = CreateInvestigationSchema.safeParse({ question });
    if (!parsed.success) { setInvalid(true); setError("请输入 1–4000 字的具体调查问题。"); questionInput.current?.focus(); return; }
    setInvalid(false);
    setError(null);
    if (submission.current?.question !== parsed.data.question) submission.current = { question: parsed.data.question, key: crypto.randomUUID() };
    await run(async (signal) => { try {
      const result = await readApi("/api/investigations", AcceptedInvestigationSchema, {
        ...postJson(parsed.data), signal, expectedStatus: 202, headers: { "Content-Type": "application/json", "Idempotency-Key": submission.current!.key }
      });
      if (signal.aborted) return;
      submission.current = null;
      router.push(`/investigations/${result.investigationId}`);
    } catch (failure) { if (!signal.aborted) setError(`${errorMessage(failure)} 再次提交相同问题会沿用本次提交键，以免重复创建。`); } });
  }
  return <form onSubmit={submit} className={styles.form}>
    <label htmlFor="question">你想核实什么？</label>
    <textarea ref={questionInput} id="question" name="question" placeholder="写下产品名称，以及你真正想核实的问题…" value={question} onChange={(event) => { setQuestion(event.target.value); if (invalid) { setInvalid(false); setError(null); } }} maxLength={4000} required rows={6} disabled={busy} aria-invalid={invalid} aria-describedby={`question-help question-count${error ? " question-error" : ""}`} />
    <div className={styles.formFoot}><p id="question-help" className={styles.muted}>写明产品名称、具体问题，以及已知的版本或套餐。</p><span id="question-count" className={styles.meta}>{question.length} / 4000</span></div>
    {error && <p id="question-error" role="alert" className={styles.errorText}>{error}</p>}
    <button type="submit" disabled={busy} className={styles.primary}>{busy ? "正在提交…" : "发起调查"}</button>
    <p className={styles.meta}>提交后生成独立调查链接，可随时刷新查看。</p>
  </form>;
}
