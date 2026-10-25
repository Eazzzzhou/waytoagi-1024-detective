import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../server/storage/client";
import { investigationHandler } from "../server/investigation/handler";
import { PostgresInvestigationQueue, readWorkerConfig } from "../server/queue";
import { WorkerRunner } from "./runner";
import { PostgresAdviceQueue } from "../server/queue/advice-postgres";
import { AdviceWorkerRunner } from "./advice-runner";
import { adviceHandler } from "./advice-handler";

/** Real Worker lifecycle shared by the CLI and process acceptance harness; no test handler injection. */
export async function runWorker(signal: AbortSignal) {
  const config = readWorkerConfig();
  const db = createDatabaseClient();
  const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
  const stop = new AbortController();
  const combined = AbortSignal.any([signal, stop.signal]);
  const running = [
    new WorkerRunner(new PostgresInvestigationQueue(db, config.queue), investigationHandler, workerId, config.worker).run(combined),
    new AdviceWorkerRunner(new PostgresAdviceQueue(db, config.queue), adviceHandler, workerId, config.worker).run(combined)
  ];
  try { await Promise.all(running); }
  finally { stop.abort(); await Promise.allSettled(running); await db.$disconnect(); }
}
