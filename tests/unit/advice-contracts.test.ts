import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AdviceRequestDetailSchema, AdviceRequestSchema, CreateAdviceRequestSchema, type Advice, type AdviceRequest } from "../../src/contracts";

const timestamp = "2026-10-25T04:00:00.000Z";
function pending(): AdviceRequest {
  return { id: randomUUID(), type: "ADVICE", investigationId: randomUUID(), snapshotId: randomUUID(), userConditions: { useCase: "Synthetic requirement", experience: null, budget: null, requirements: [] }, status: "PENDING", resultAdviceId: null, error: null, conditionsIssue: null, createdAt: timestamp, updatedAt: timestamp, completedAt: null };
}
function result(request: AdviceRequest): Advice {
  return { id: randomUUID(), snapshotId: request.snapshotId, userConditions: request.userConditions, content: "Synthetic advice", generationConfig: { provider: "test", model: "test", promptVersion: "test", temperature: null, generatedAt: timestamp } };
}
describe("portable advice request contracts", () => {
  it("accepts unknown optional conditions without inferring a budget or experience", () => {
    const request = pending();
    const body = { snapshotId: request.snapshotId, userConditions: request.userConditions };
    expect(CreateAdviceRequestSchema.parse(body)).toEqual(body);
    expect(CreateAdviceRequestSchema.safeParse({ ...body, userConditions: { ...request.userConditions, useCase: " " } }).success).toBe(false);
    expect(CreateAdviceRequestSchema.safeParse({ ...body, question: "Unagreed field" }).success).toBe(false);
  });
  it("enforces exclusive terminal results, condition issues and system failures", () => {
    const request = pending();
    expect(AdviceRequestSchema.parse(request).status).toBe("PENDING");
    expect(AdviceRequestSchema.parse({ ...request, status: "RUNNING" }).status).toBe("RUNNING");
    const failure = { code: "PROVIDER_NOT_CONFIGURED", message: "Synthetic failure", retryable: false };
    expect(AdviceRequestSchema.safeParse({ ...request, status: "FAILED", error: failure, completedAt: timestamp }).success).toBe(true);
    const issue = { message: "Synthetic condition issue", missingConditions: ["Deployment details"] };
    expect(AdviceRequestSchema.safeParse({ ...request, status: "INSUFFICIENT_CONDITIONS", conditionsIssue: issue, completedAt: timestamp }).success).toBe(true);
    for (const patch of [{ status: "SUCCEEDED", completedAt: timestamp }, { status: "FAILED", completedAt: timestamp }, { status: "INSUFFICIENT_CONDITIONS", completedAt: timestamp }, { status: "PENDING", error: failure }, { status: "RUNNING", completedAt: timestamp }, { status: "FAILED", error: failure, conditionsIssue: issue, completedAt: timestamp }, { status: "INSUFFICIENT_CONDITIONS", conditionsIssue: { ...issue, missingConditions: [] }, completedAt: timestamp }]) {
      expect(AdviceRequestSchema.safeParse({ ...request, ...patch }).success).toBe(false);
    }
  });
  it("binds a success response to exactly its snapshot, conditions and Advice ID", () => {
    const request = pending();
    const advice = result(request);
    const success = { ...request, status: "SUCCEEDED", resultAdviceId: advice.id, completedAt: timestamp };
    expect(AdviceRequestDetailSchema.safeParse({ request: success, advice }).success).toBe(true);
    expect(AdviceRequestDetailSchema.safeParse({ request, advice: null }).success).toBe(true);
    for (const invalid of [null, { ...advice, id: randomUUID() }, { ...advice, snapshotId: randomUUID() }, { ...advice, userConditions: { ...advice.userConditions, requirements: ["Different condition"] } }]) {
      expect(AdviceRequestDetailSchema.safeParse({ request: success, advice: invalid }).success).toBe(false);
    }
    expect(AdviceRequestDetailSchema.safeParse({ request, advice }).success).toBe(false);
  });
});
