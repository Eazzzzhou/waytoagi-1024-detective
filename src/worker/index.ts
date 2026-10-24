import "dotenv/config";
import { classifyFailure, readWorkerConfig } from "../server/queue";
import { runWorker } from "./runtime";

async function main() {
  const config = readWorkerConfig();
  const controller = new AbortController();
  let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    shutdownTimer = setTimeout(() => {
      console.error(JSON.stringify({ event: "worker.shutdown_deadline" }));
      process.exit(1);
    }, config.worker.shutdownGraceMs);
    // If a provider ignores cancellation and holds sockets open, force termination after the grace period.
    shutdownTimer.unref();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try { await runWorker(controller.signal); }
  finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ event: "worker.fatal", error: classifyFailure(error) }));
  process.exitCode = 1;
});
