import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../server/storage/client";
import { investigationHandler } from "../server/investigation/handler";
import { PostgresInvestigationQueue, readWorkerConfig } from "../server/queue";
import { WorkerRunner } from "./runner";

/** Real Worker lifecycle shared by the CLI and process acceptance harness; no test handler injection. */
export async function runWorker(signal: AbortSignal) {
  const config = readWorkerConfig();
  const db = createDatabaseClient();
  const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
  try { await new WorkerRunner(new PostgresInvestigationQueue(db, config.queue), investigationHandler, workerId, config.worker).run(signal); }
  finally { await db.$disconnect(); }
}
