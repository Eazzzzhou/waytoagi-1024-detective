"use client";
import { useRef, useState, type FormEvent } from "react";
import { AcceptedInvestigationSchema, IdentityConfirmationBodySchema, type ConfirmationRequest } from "@/contracts";
import { errorMessage, postJson, readApi } from "./api-client";
import styles from "./workbench.module.css";

export interface IdentityConfirmationFormProps { investigationId: string; request: ConfirmationRequest; expectedAttemptCount: number; onConfirmed(): Promise<void> }
function localDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function IdentityConfirmationForm({ investigationId, request, expectedAttemptCount, onConfirmed }: IdentityConfirmationFormProps) {
  const identity = request.identity;
  const basis = identity.confirmationBasis[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const date = new Date(text("retrievedAt"));
    const parsed = IdentityConfirmationBodySchema.safeParse({ expectedAttemptCount, identity: {
      name: text("name"), officialWebsite: text("officialWebsite"), version: text("version") || null, plan: text("plan") || null, confirmationStatus: "CONFIRMED",
      confirmationBasis: [{ url: text("basisUrl"), excerpt: text("excerpt"), reason: text("reason"), retrievedAt: Number.isNaN(date.getTime()) ? "" : date.toISOString() }]
    } });
    if (!parsed.success) { setError("请填写产品名称、有效官网、原句、来源链接、实际获取时间与确认理由。"); return; }
    submitting.current = true; setBusy(true); setError(null);
    try { await readApi(`/api/investigations/${investigationId}/identity`, AcceptedInvestigationSchema, postJson(parsed.data)); await onConfirmed(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section className={styles.panel}>
    <h2>确认产品身份</h2><p>{request.reason}</p>
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={busy} className={styles.fields}>
        <label>产品名称<input name="name" defaultValue={identity.name} required /></label>
        <label>官网<input name="officialWebsite" type="url" defaultValue={identity.officialWebsite ?? ""} required /></label>
        <label>版本（未知可留空）<input name="version" defaultValue={identity.version ?? ""} /></label>
        <label>套餐（未知可留空）<input name="plan" defaultValue={identity.plan ?? ""} /></label>
        <label className={styles.full}>依据的来源链接<input name="basisUrl" type="url" defaultValue={basis?.url ?? ""} required /></label>
        <label className={styles.full}>用于确认身份的原文<textarea name="excerpt" maxLength={300} defaultValue={basis?.excerpt ?? ""} rows={3} required /></label>
        <label>原文获取时间（本机时间）<input name="retrievedAt" type="datetime-local" defaultValue={localDate(basis?.retrievedAt)} required /></label>
        <label>确认理由<input name="reason" defaultValue={basis?.reason ?? ""} required /></label>
      </fieldset>
      <p className={styles.meta}>请按实际核查情况填写依据。未知版本或套餐保持为空。</p>
      {error && <p role="alert" className={styles.errorText}>{error}</p>}
      <button className={styles.primary} disabled={busy}>{busy ? "正在确认…" : "确认身份并继续"}</button>
    </form>
  </section>;
}
