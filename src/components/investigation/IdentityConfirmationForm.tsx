"use client";
import { useRef, useState, type FormEvent } from "react";
import { AcceptedInvestigationSchema, IdentityConfirmationBodySchema, type ConfirmationRequest } from "@/contracts";
import { errorMessage, postJson, readApi } from "./api-client";
import styles from "./workbench.module.css";

export interface IdentityConfirmationFormProps { investigationId: string; request: ConfirmationRequest; expectedAttemptCount: number; onConfirmed(): Promise<void> }
export function IdentityConfirmationForm({ investigationId, request, expectedAttemptCount, onConfirmed }: IdentityConfirmationFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const userClarification = String(new FormData(event.currentTarget).get("clarification") ?? "").trim();
    const parsed = IdentityConfirmationBodySchema.safeParse({ expectedAttemptCount, identity: {
      ...request.identity, confirmationStatus: "UNRESOLVED", userClarification
    } });
    if (!parsed.success) { setError("请简短说明你指的是哪一个。"); return; }
    submitting.current = true; setBusy(true); setError(null);
    try { await readApi(`/api/investigations/${investigationId}/identity`, AcceptedInvestigationSchema, postJson(parsed.data)); await onConfirmed(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section className={styles.panel}>
    <h2>确认一下</h2>
    <form onSubmit={submit} className={styles.form}>
      <label>{request.reason}<input name="clarification" maxLength={500} required disabled={busy} /></label>
      {error && <p role="alert" className={styles.errorText}>{error}</p>}
      <button className={styles.primary} disabled={busy}>{busy ? "正在继续…" : "继续调查"}</button>
    </form>
  </section>;
}
