import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Generate/build must work without secrets. Runtime and migration commands require a real URL.
  datasource: { url: process.env.DATABASE_URL ?? "" }
});
