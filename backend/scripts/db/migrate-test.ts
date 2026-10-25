import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readTestDatabaseUrl } from "../../src/server/env";

const url = readTestDatabaseUrl();
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit", env: { ...process.env, DATABASE_URL: url }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
