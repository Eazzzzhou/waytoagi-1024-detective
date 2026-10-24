import { createDatabaseClient } from "../../src/server/storage/client";
import { readTestDatabaseUrl } from "../../src/server/env";
import { PostgresInvestigationQueue } from "../../src/server/queue";

const url = readTestDatabaseUrl();
if (!/^queue_test_[a-f0-9]{32}$/.test(new URL(url).searchParams.get("schema") ?? "")) throw new Error("Crash fixture requires an isolated test schema");
const db = createDatabaseClient(url);
const queue = new PostgresInvestigationQueue(db, { leaseMs: 100, attemptTimeoutMs: 5000 });
const lease = await queue.claim("crashing-test-worker");
process.send?.({ lease });
// Deliberately omit heartbeat/finalization. The parent forcibly kills this test-only child.
setInterval(() => undefined, 1000);
