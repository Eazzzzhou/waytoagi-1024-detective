import { describe, expect, it } from "vitest";
import { readDatabaseUrl, readTestDatabaseUrl } from "../../src/server/env";
import { identityProvider } from "../../src/server/identity";
import { retrievalProvider, sourceProvider } from "../../src/server/retrieval";
import { answerProvider, claimExtractionProvider, verificationProvider } from "../../src/server/verification";
import { recommendationProvider } from "../../src/server/recommendation";
import { modelProvider } from "../../src/server/models";
import { AnswerSchema } from "../../src/contracts";
import { makeSnapshot } from "../fixtures/snapshot";

describe("server boundaries", () => {
  it("fails closed for every unconfigured real capability", async () => {
    const snapshot = makeSnapshot();
    for (const action of [
      () => identityProvider.resolve("test"), () => retrievalProvider.search("test", snapshot.productIdentity),
      () => sourceProvider.fetch("https://example.com"), () => verificationProvider.verify(snapshot),
      () => answerProvider.generate(snapshot), () => recommendationProvider.generate(snapshot, { useCase: "test", experience: null, budget: null, requirements: [] }),
      () => claimExtractionProvider.extract(snapshot.evidence, snapshot.productIdentity),
      () => modelProvider.generate({ prompt: "test", outputSchema: AnswerSchema })
    ]) await expect(action()).rejects.toMatchObject({ detail: { code: "PROVIDER_NOT_CONFIGURED", retryable: false } });
  });
  it("requires PostgreSQL and refuses the application database as a test target", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "https://example.com" })).toThrow();
    expect(() => readTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://localhost/app" })).toThrow();
    const url = "postgresql://localhost/app_test";
    expect(() => readTestDatabaseUrl({ DATABASE_URL: url, TEST_DATABASE_URL: `${url}?schema=other` })).toThrow();
    expect(readTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
    expect(() => readTestDatabaseUrl({ DATABASE_URL: "postgresql://localhost/app_test", TEST_DATABASE_URL: "postgresql://127.0.0.1/app_test" })).toThrow();
  });
});
