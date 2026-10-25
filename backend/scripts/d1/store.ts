import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { D1RunRecordSchema, type D1RunRecord } from "./rules";

export async function writeRunRecord(record: D1RunRecord, root = "cases/runs"): Promise<string> {
  const parsed = D1RunRecordSchema.parse(record);
  const directory = join(root, parsed.case.caseId);
  const path = join(directory, `${parsed.runId}.json`);
  await mkdir(directory, { recursive: true });
  // wx is deliberate: an evaluation run must never overwrite another run record.
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return path;
}
