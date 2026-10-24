"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AcceptedInvestigationSchema, InvestigationDetailSchema, SnapshotResponseSchema, type InvestigationDetail as Detail, type SnapshotResponse } from "@/contracts";
import { errorMessage, postJson, readApi } from "./api-client";
import { STAGE_LABELS, STATUS_LABELS, formatTime } from "./labels";
import { IdentityConfirmationForm } from "./IdentityConfirmationForm";
import { SnapshotView } from "./SnapshotView";
import styles from "./workbench.module.css";

export function InvestigationDetail({ investigationId }: { investigationId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(async () => { setRevision((value) => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    async function poll() {
      try {
        const detail = await readApi(`/api/investigations/${investigationId}`, InvestigationDetailSchema, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setData(detail); setError(null); errors = 0;
        if (detail.investigation.status === "PENDING" || detail.investigation.status === "RUNNING") timer = setTimeout(poll, 2000);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(errorMessage(failure));
        if (++errors < 3) timer = setTimeout(poll, 3000);
      }
    }
    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [investigationId, revision]);
  const snapshotId = data?.investigation.resultSnapshotId;
  useEffect(() => {
    if (!snapshotId) return;
    const controller = new AbortController();
    readApi(`/api/snapshots/${snapshotId}`, SnapshotResponseSchema, { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setSnapshot(value); setSnapshotError(null); }
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setSnapshotError(errorMessage(failure)); });
    return () => controller.abort();
  }, [snapshotId, revision]);
  async function retry() {
    if (!data?.retry.allowed || actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(null);
    try { await readApi(`/api/investigations/${investigationId}/retry`, AcceptedInvestigationSchema, postJson({ expectedAttemptCount: data.retry.expectedAttemptCount })); await refresh(); }
    catch (failure) { setError(errorMessage(failure)); await refresh(); }
    finally { actionPending.current = false; setBusy(false); }
  }
  return <>
    <header className={styles.titleRow}><div><h1>调查详情</h1><p className={styles.muted}>查看执行状态，核对每一条依据。</p></div><button className={styles.secondary} onClick={() => void refresh()}>刷新状态</button></header>
    {error && <div role="alert" className={styles.notice}><p>{error}</p>{data && <p className={styles.meta}>当前保留的是上次读取的状态，更新时间：{formatTime(data.investigation.updatedAt)}</p>}</div>}
    {!data && !error && <section className={styles.panel} aria-busy="true"><p>正在读取调查记录…</p></section>}
    {data && <>
      <section className={styles.panel} aria-label="调查状态">
        <div className={styles.sectionHead}><h2 className={styles.question}>{data.investigation.question}</h2><span role="status" className={`${styles.status} ${data.investigation.status === "FAILED" ? styles.failed : ""}`}>{STATUS_LABELS[data.investigation.status]}</span></div>
        <dl className={styles.metadata}>
          <div><dt>执行阶段</dt><dd>{STAGE_LABELS[data.investigation.stage]}</dd></div>
          <div><dt>创建时间</dt><dd>{formatTime(data.investigation.createdAt)}</dd></div>
          <div><dt>更新时间</dt><dd>{formatTime(data.investigation.updatedAt)}</dd></div>
        </dl>
        <p className={styles.meta}>调查 ID <code>{investigationId}</code></p>
        {data.investigation.status === "PENDING" && <p className={styles.muted}>任务已入队，等待 Worker 领取。自动退避中的任务将在到期后继续；Worker 未启动时会保持排队。</p>}
        {data.investigation.status === "RUNNING" && <p className={styles.muted}>后台正在执行调查，状态每两秒读取一次。</p>}
        {data.investigation.status === "SUCCEEDED" && <p className={styles.muted}>结果已保存，可以通过来源链接和原文定位复核。</p>}
        {data.investigation.error && <div className={styles.notice}><h3>{data.investigation.status === "FAILED" ? "执行未完成" : "最近一次执行错误"}</h3><p>{data.investigation.error.message}</p><code>{data.investigation.error.code}</code>
          {data.investigation.error.code === "PROVIDER_NOT_CONFIGURED" && <p>真实检索或核查服务尚未配置，本次调查没有生成答案或证据。</p>}
        </div>}
        {data.investigation.status === "FAILED" && <div className={styles.actionRow}><button className={styles.primary} disabled={!data.retry.allowed || busy} onClick={() => void retry()}>{busy ? "正在恢复任务…" : "重试调查"}</button><p className={styles.muted}>{data.retry.reason}</p></div>}
      </section>
      {data.identityConfirmation && <IdentityConfirmationForm key={data.retry.expectedAttemptCount} investigationId={investigationId} request={data.identityConfirmation} expectedAttemptCount={data.retry.expectedAttemptCount} onConfirmed={refresh} />}
      {snapshotId ? <>{snapshotError && <section className={styles.panel} role="alert"><h2>结果暂时无法读取</h2><p>{snapshotError}</p><button className={styles.secondary} onClick={() => void refresh()}>重新读取结果</button></section>}
        {snapshot?.snapshot.id === snapshotId ? <SnapshotView data={snapshot} /> : !snapshotError && <section className={styles.panel} aria-busy="true"><h2>调查结果</h2><p>正在读取证据快照与回答…</p></section>}</>
        : <section className={styles.panel}><h2>证据与回答</h2><p className={styles.empty}>尚无证据快照。取得并核查的来源、原文与回答将在此显示。</p></section>}
    </>}
  </>;
}
