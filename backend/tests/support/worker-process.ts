/** IPC only supplies the supervisor AbortSignal; the production handler/runtime are unchanged. */
import "dotenv/config";
import { runWorker } from "../../src/worker/runtime";

const controller = new AbortController();
process.on("message", (message: unknown) => { if (message === "shutdown") controller.abort(); });
process.on("disconnect", () => controller.abort());
try { await runWorker(controller.signal); }
finally { process.disconnect?.(); }
