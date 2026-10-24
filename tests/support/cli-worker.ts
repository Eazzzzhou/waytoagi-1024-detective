/** Manual Ctrl+C acceptance: load the real CLI in the signal-receiving process. */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { createQueueTestDatabase } from "./database";

const database = await createQueueTestDatabase();
Object.assign(process.env, { DATABASE_URL: database.connectionString, WORKER_POLL_MS: "200", WORKER_LEASE_MS: "2000", WORKER_HEARTBEAT_MS: "200", WORKER_TIMEOUT_MS: "3000", WORKER_SHUTDOWN_GRACE_MS: "2000" });
let output = "";
let interrupted = false;
const originalLog = console.log;
console.log = (...values: unknown[]) => { output += values.map(String).join(" "); originalLog(...values); };
process.once("SIGINT", () => { interrupted = true; });
process.once("beforeExit", () => {
  void (async () => {
    await database.close();
    console.log = originalLog;
    const result = { status: interrupted && !process.exitCode && output.includes('"event":"worker.started"') && output.includes('"event":"worker.stopped"') ? "passed" : "failed", signal: "SIGINT", isolatedSchemaCleaned: true };
    await mkdir(".cache/acceptance", { recursive: true });
    await writeFile(".cache/acceptance/worker-cli.json", JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    if (result.status !== "passed") process.exitCode = 1;
  })().catch(() => { process.exitCode = 1; });
});
await import("../../src/worker/index");
