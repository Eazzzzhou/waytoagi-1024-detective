import "dotenv/config";
import { parseArgs } from "node:util";
import { createDatabaseClient } from "../../src/server/storage/client";
import { PostgresInvestigationQueue, classifyFailure, readQueueConfig } from "../../src/server/queue";

async function main() {
  const { values } = parseArgs({ options: { key: { type: "string" }, question: { type: "string" } } });
  const db = createDatabaseClient();
  try {
    const result = await new PostgresInvestigationQueue(db, readQueueConfig()).enqueue({ idempotencyKey: values.key, question: values.question });
    console.log(JSON.stringify({ investigationId: result.investigation?.id, jobId: result.jobId, reused: result.reused }));
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => { console.error(JSON.stringify(classifyFailure(error))); process.exitCode = 1; });
