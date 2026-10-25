import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { AcceptedInvestigationSchema } from "../../src/contracts";

// Inputs are natural questions only. Evaluation references are never loaded here.
const { values } = parseArgs({ options: {
  engine: { type: "string" }, batch: { type: "string" }, base: { type: "string", default: "http://127.0.0.1:3104" },
  cases: { type: "string", default: "S0,S1,S2,S3,S4,S5,S6,S7,S8" }, depth: { type: "string", default: "AUTO" },
  prompts: { type: "string" }
} });
if (!values.engine || !values.batch || !values.prompts) throw new Error("--engine, --batch and --prompts are required");
const directory = resolve("research/v4-runs", values.batch, values.engine);
await mkdir(directory, { recursive: true });
const cases = [];
for (const id of values.cases!.split(",")) {
  if (!/^S[0-8]$/.test(id)) throw new Error("Unsupported frozen case identifier");
  const prompt = await readFile(resolve(values.prompts!, `${id}.txt`), "utf8");
  const question = prompt.match(/^问题：[ \t]*(.+)$/m)?.[1]?.trim();
  if (!question) throw new Error(`Missing natural question: ${id}`);
  cases.push({ id, question });
}
const manifest = { startedAt: new Date().toISOString(), engine: values.engine,
  codeCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  base: values.base, requestedDepth: values.depth,
  comparisonCeilings: { totalMs: 180000, searchCalls: 6, documentAttempts: 10, reserveMs: 45000 },
  cases, runs: [] as { case: string; investigationId: string; captureExit: number | null; completedAt: string }[] };
const save = () => writeFile(resolve(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
await save();
for (const item of cases) {
  const response = await fetch(`${values.base}/api/investigations`, { method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `${values.batch}:${values.engine}:${item.id}` },
    body: JSON.stringify({ question: item.question, researchDepth: values.depth }) });
  if (response.status !== 202) throw new Error(`Submission ${item.id}: HTTP ${response.status}`);
  const { investigationId } = AcceptedInvestigationSchema.parse(await response.json());
  const target = resolve(directory, item.id, investigationId);
  console.log(JSON.stringify({ event: "case.started", case: item.id, investigationId }));
  const exit = await new Promise<number | null>((done, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/investigation/capture.ts", investigationId, target, values.base!], { stdio: "inherit", windowsHide: true });
    child.on("error", reject); child.on("exit", done);
  });
  manifest.runs.push({ case: item.id, investigationId, captureExit: exit, completedAt: new Date().toISOString() });
  await save();
  if (exit === 0) {
    const snapshot = JSON.parse(await readFile(resolve(target, "snapshot-response.json"), "utf8"));
    if (Boolean(snapshot.snapshot.research) !== (values.engine !== "v3")) throw new Error("Worker engine differs from assigned comparison engine; stop batch");
  }
}
console.log(JSON.stringify({ event: "batch.completed", directory, runs: manifest.runs.length }));
