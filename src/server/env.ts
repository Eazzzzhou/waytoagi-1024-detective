import { z } from "zod";

export const DatabaseUrlSchema = z.url().refine((value) => ["postgresql:", "postgres:"].includes(new URL(value).protocol), "PostgreSQL URL required");

export function readDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  return DatabaseUrlSchema.parse(env.DATABASE_URL);
}

export function readTestDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = DatabaseUrlSchema.parse(env.TEST_DATABASE_URL);
  if (!new URL(url).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL database name must end with _test");
  // Be conservative about host aliases (localhost / 127.0.0.1 / IPv6 / DNS): a test
  // database must have a distinct name, even if the connection hosts differ.
  if (env.DATABASE_URL && decodeURIComponent(new URL(env.DATABASE_URL).pathname) === decodeURIComponent(new URL(url).pathname)) throw new Error("Test database must differ from application database");
  return url;
}
