import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { readDatabaseUrl } from "../env";

export function createDatabaseClient(connectionString = readDatabaseUrl()): PrismaClient {
  const schema = new URL(connectionString).searchParams.get("schema") ?? "public";
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000 }, { schema }) });
}

const globalDatabase = globalThis as unknown as { investigationDatabase?: PrismaClient };
export function getDatabaseClient(): PrismaClient {
  globalDatabase.investigationDatabase ??= createDatabaseClient();
  return globalDatabase.investigationDatabase;
}
