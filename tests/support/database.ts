import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { readTestDatabaseUrl } from "../../src/server/env";
import { createDatabaseClient } from "../../src/server/storage/client";

/** Committed concurrency tests live in an isolated schema, never in the application database. */
export async function createQueueTestDatabase(options: { migrateWithPrisma?: boolean; throughMigration?: string } = {}) {
  const baseUrl = readTestDatabaseUrl();
  const schema = `queue_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: baseUrl });
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const connectionString = url.toString();
  const pool = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  try {
    if (options.migrateWithPrisma) {
      if (options.throughMigration) throw new Error("Partial migrations require SQL test setup");
      const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: connectionString }, encoding: "utf8", timeout: 30000 });
      if (migration.error || migration.status !== 0) throw new Error("Prisma migrate deploy failed on the isolated acceptance schema");
    } else {
      const migrations = (await readdir("prisma/migrations", { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name).sort();
      if (options.throughMigration && !migrations.includes(options.throughMigration)) throw new Error("Unknown test migration boundary");
      for (const name of migrations.filter((name) => !options.throughMigration || name <= options.throughMigration)) await pool.query(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
    }
  } catch (error) {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    throw error;
  }
  const db = createDatabaseClient(connectionString);
  const competitor = createDatabaseClient(connectionString);
  return {
    db, competitor, pool, connectionString, schema,
    async close() {
      await Promise.all([db.$disconnect(), competitor.$disconnect(), pool.end()]);
      if (!/^queue_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Refusing to drop an unexpected test schema");
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    }
  };
}
