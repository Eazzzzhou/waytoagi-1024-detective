import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { AdviceRequestDetailSchema, AdviceRequestSchema, AdviceSchema, CreateAdviceRequestSchema, IdSchema, TextSchema, type AdviceRequest } from "../../contracts";
import { IdempotencyConflictError } from "../queue/errors";
import { ResourceNotFoundError, StoredDataError } from "./errors";
import { InvestigationRepository } from "./repository";

type Database = PrismaClient | Prisma.TransactionClient;
const KeySchema = TextSchema.max(200);
const digest = (investigationId: string, input: unknown) => createHash("sha256").update(`advice:v1:${investigationId}:${JSON.stringify(CreateAdviceRequestSchema.parse(input))}`).digest("hex");

export class AdviceRepository {
  constructor(private readonly db: Database) {}

  private async snapshot(investigationId: string, snapshotId: string) {
    const snapshot = await new InvestigationRepository(this.db).findSnapshot(snapshotId);
    if (!snapshot || snapshot.investigationId !== investigationId) throw new ResourceNotFoundError();
    return snapshot;
  }

  private parseRequest(row: Prisma.AdviceRequestGetPayload<object>): AdviceRequest {
    const request = AdviceRequestSchema.parse({
      id: row.id, type: row.type, investigationId: row.investigationId, snapshotId: row.snapshotId,
      userConditions: row.userConditions, status: row.status, resultAdviceId: row.resultAdviceId,
      conditionsIssue: row.conditionsIssue, error: row.error,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null
    });
    if (!KeySchema.safeParse(row.idempotencyKey).success || row.requestHash !== digest(request.investigationId, { snapshotId: request.snapshotId, userConditions: request.userConditions })) throw new StoredDataError();
    return request;
  }

  /** A durable PENDING task, independent of investigation Job. No generation or task reuse. */
  async createRequest(investigationIdInput: unknown, input: unknown, keyInput: unknown, maxAttemptsInput: unknown = 3) {
    const investigationId = IdSchema.parse(investigationIdInput);
    const body = CreateAdviceRequestSchema.parse(input);
    const idempotencyKey = KeySchema.parse(keyInput);
    const maxAttempts = z.number().int().min(1).max(20).parse(maxAttemptsInput);
    await this.snapshot(investigationId, body.snapshotId);
    const requestHash = digest(investigationId, body);
    const created = await this.db.adviceRequest.createMany({
      data: { investigationId, ...body, idempotencyKey, requestHash, maxAttempts }, skipDuplicates: true
    });
    const row = await this.db.adviceRequest.findUniqueOrThrow({ where: { investigationId_idempotencyKey: { investigationId, idempotencyKey } } });
    const request = this.parseRequest(row);
    if (row.requestHash !== requestHash) throw new IdempotencyConflictError();
    return { request, reused: created.count === 0 };
  }

  async findRequest(investigationIdInput: unknown, idInput: unknown) {
    const investigationId = IdSchema.parse(investigationIdInput);
    const id = IdSchema.parse(idInput);
    const row = await this.db.adviceRequest.findUnique({ where: { id } });
    if (!row || row.investigationId !== investigationId) throw new ResourceNotFoundError();
    const request = this.parseRequest(row);
    await this.snapshot(investigationId, request.snapshotId);
    const advice = request.resultAdviceId ? await this.findAdvice(investigationId, request.resultAdviceId) : null;
    const detail = AdviceRequestDetailSchema.parse({ request, advice });
    // Stage-4 publications bind the entire canonical result, not just its IDs/schema.
    // Legacy stage-3 results have no completionHash and remain read-compatible.
    if (row.completionHash) {
      const result = request.status === "SUCCEEDED" ? { kind: "COMPLETE", advice } : { kind: "INSUFFICIENT_CONDITIONS", issue: request.conditionsIssue };
      if (!["SUCCEEDED", "INSUFFICIENT_CONDITIONS"].includes(request.status) || createHash("sha256").update(JSON.stringify(result)).digest("hex") !== row.completionHash) throw new StoredDataError();
    }
    return detail;
  }

  /** Validates execution input without depending on a possibly damaged terminal result. */
  async loadRequest(investigationIdInput: unknown, idInput: unknown) {
    const investigationId = IdSchema.parse(investigationIdInput);
    const row = await this.db.adviceRequest.findUnique({ where: { id: IdSchema.parse(idInput) } });
    if (!row || row.investigationId !== investigationId) throw new ResourceNotFoundError();
    const request = this.parseRequest(row);
    const snapshot = await this.snapshot(investigationId, request.snapshotId);
    return { request, snapshot };
  }

  /** Stores a validated result only. Stage-4 queue must link it under a live lease in the same transaction. */
  async createAdviceForRequest(investigationIdInput: unknown, requestIdInput: unknown, input: unknown) {
    const { request } = await this.findRequest(investigationIdInput, requestIdInput);
    const advice = AdviceSchema.parse(input);
    if (!["PENDING", "RUNNING", "SUCCEEDED"].includes(request.status) || advice.snapshotId !== request.snapshotId || JSON.stringify(advice.userConditions) !== JSON.stringify(request.userConditions) || (request.resultAdviceId && request.resultAdviceId !== advice.id)) throw new IdempotencyConflictError("Advice does not match this request's snapshot, conditions or existing result");
    return this.createAdvice(investigationIdInput, advice);
  }

  /** Unlinked storage also permits validation of historical Advice without rewriting it. */
  async createAdvice(investigationIdInput: unknown, input: unknown) {
    const investigationId = IdSchema.parse(investigationIdInput);
    const advice = AdviceSchema.parse(input);
    await this.snapshot(investigationId, advice.snapshotId);
    await this.db.advice.createMany({ data: { id: advice.id, snapshotId: advice.snapshotId, body: advice, generatedAt: new Date(advice.generationConfig.generatedAt) }, skipDuplicates: true });
    const stored = await this.findAdvice(investigationId, advice.id);
    if (JSON.stringify(stored) !== JSON.stringify(advice)) throw new IdempotencyConflictError("Advice ID is already bound to a different result");
    return stored;
  }

  async findAdvice(investigationIdInput: unknown, idInput: unknown) {
    const investigationId = IdSchema.parse(investigationIdInput);
    const id = IdSchema.parse(idInput);
    const row = await this.db.advice.findUnique({ where: { id } });
    if (!row) throw new ResourceNotFoundError();
    const advice = AdviceSchema.parse(row.body);
    if (advice.id !== row.id || advice.snapshotId !== row.snapshotId || Date.parse(advice.generationConfig.generatedAt) !== row.generatedAt.getTime()) throw new StoredDataError();
    await this.snapshot(investigationId, advice.snapshotId);
    return advice;
  }
}
