import { createHash, randomUUID } from "node:crypto";
import type { AdviceRequest, Prisma, PrismaClient } from "../../generated/prisma/client";
import { ErrorSchema, TextSchema, type DomainError } from "../../contracts";
import { AdviceRepository } from "../storage/advice-repository";
import { AdviceExecutionLeaseSchema, AdviceHandlerResultSchema, type AdviceExecutionLease } from "./advice-contracts";
import { QueueOptionsSchema, type QueueOptions } from "./config";
import { IdempotencyConflictError, LeaseLostError, TaskFailure, redactFailure } from "./errors";

type Tx = Prisma.TransactionClient;
type Visibility = (scope: { requestId: string; investigationId: string; snapshotId: string }) => boolean;

export class PostgresAdviceQueue {
  readonly options: QueueOptions;
  // A synchronous trusted server policy, never a request-supplied owner or a remote call in a transaction.
  constructor(private readonly db: PrismaClient, options: Partial<QueueOptions> = {}, private readonly canAccessSnapshot: Visibility = () => true) {
    this.options = QueueOptionsSchema.parse(options);
  }

  private transaction<T>(run: (tx: Tx) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '2s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '4s'`;
      return run(tx);
    }, { maxWait: 5000, timeout: 5000 });
  }

  async claim(workerInput: unknown): Promise<AdviceExecutionLease | null> {
    const workerId = TextSchema.max(200).parse(workerInput);
    return this.transaction(async (tx) => {
      const [candidate] = await tx.$queryRaw<AdviceRequest[]>`
        SELECT * FROM "AdviceRequest" WHERE "status" = 'PENDING' AND "availableAt" <= clock_timestamp() AND "failureCount" < "maxAttempts"
        ORDER BY "availableAt", "createdAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!candidate) return null;
      const token = randomUUID();
      const [row] = await tx.$queryRaw<AdviceRequest[]>`
        UPDATE "AdviceRequest" SET "status" = 'RUNNING', "attemptCount" = "attemptCount" + 1,
          "executionToken" = ${token}::uuid, "leaseOwner" = ${workerId}, "heartbeatAt" = clock_timestamp(),
          "leaseExpiresAt" = LEAST(clock_timestamp() + ${this.options.leaseMs} * interval '1 millisecond', clock_timestamp() + ${this.options.attemptTimeoutMs} * interval '1 millisecond'),
          "runDeadlineAt" = clock_timestamp() + ${this.options.attemptTimeoutMs} * interval '1 millisecond', "updatedAt" = clock_timestamp()
        WHERE "id" = ${candidate.id}::uuid RETURNING *`;
      const request = row!;
      const attempt = await tx.adviceExecutionAttempt.create({ data: { requestId: request.id, attemptNumber: request.attemptCount, executionToken: token, workerId } });
      return AdviceExecutionLeaseSchema.parse({ requestId: request.id, investigationId: request.investigationId, snapshotId: request.snapshotId, attemptId: attempt.id, executionToken: token, workerId, expiresAt: request.leaseExpiresAt });
    });
  }

  private async lockOwned(tx: Tx, lease: AdviceExecutionLease) {
    const [row] = await tx.$queryRaw<AdviceRequest[]>`
      SELECT r.* FROM "AdviceRequest" r JOIN "AdviceExecutionAttempt" a ON a."requestId" = r."id" AND a."executionToken" = r."executionToken"
      WHERE r."id" = ${lease.requestId}::uuid AND r."investigationId" = ${lease.investigationId}::uuid AND r."snapshotId" = ${lease.snapshotId}::uuid
        AND r."executionToken" = ${lease.executionToken}::uuid AND r."leaseOwner" = ${lease.workerId}
        AND a."id" = ${lease.attemptId}::uuid AND a."workerId" = ${lease.workerId} FOR UPDATE OF r`;
    if (!row) throw new LeaseLostError();
    return row;
  }

  private async assertLive(tx: Tx, lease: AdviceExecutionLease) {
    // Query AFTER the lock: lock wait time consumes both lease and deadline.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "AdviceRequest" WHERE "id" = ${lease.requestId}::uuid AND "status" = 'RUNNING'
        AND "executionToken" = ${lease.executionToken}::uuid AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()`;
    if (!rows.length) throw new LeaseLostError();
  }

  private visible(lease: AdviceExecutionLease) {
    if (this.canAccessSnapshot(lease) !== true) throw new TaskFailure({ code: "INVALID_INPUT", message: "Advice snapshot is not available to this task", retryable: false });
  }

  async heartbeat(input: unknown): Promise<AdviceExecutionLease> {
    const lease = AdviceExecutionLeaseSchema.parse(input);
    return this.transaction(async (tx) => {
      await this.lockOwned(tx, lease);
      const [row] = await tx.$queryRaw<AdviceRequest[]>`
        UPDATE "AdviceRequest" SET "heartbeatAt" = clock_timestamp(), "updatedAt" = clock_timestamp(),
          "leaseExpiresAt" = LEAST(clock_timestamp() + ${this.options.leaseMs} * interval '1 millisecond', "runDeadlineAt")
        WHERE "id" = ${lease.requestId}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${lease.executionToken}::uuid
          AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp() RETURNING *`;
      if (!row?.leaseExpiresAt || !row.heartbeatAt) throw new LeaseLostError();
      await tx.adviceExecutionAttempt.update({ where: { id: lease.attemptId }, data: { heartbeatAt: row.heartbeatAt } });
      return { ...lease, expiresAt: row.leaseExpiresAt };
    });
  }

  async loadTask(input: unknown) {
    const lease = AdviceExecutionLeaseSchema.parse(input);
    return this.transaction(async (tx) => {
      await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      this.visible(lease);
      const task = await new AdviceRepository(tx).loadRequest(lease.investigationId, lease.requestId);
      await this.assertLive(tx, lease);
      return task;
    });
  }

  async complete(input: unknown, resultInput: unknown) {
    const lease = AdviceExecutionLeaseSchema.parse(input);
    const result = AdviceHandlerResultSchema.parse(resultInput);
    const completionHash = createHash("sha256").update(JSON.stringify(result)).digest("hex");
    return this.transaction(async (tx) => {
      const request = await this.lockOwned(tx, lease);
      this.visible(lease);
      if (["SUCCEEDED", "INSUFFICIENT_CONDITIONS"].includes(request.status)) {
        if (request.completionHash !== completionHash) throw new IdempotencyConflictError("Advice request already has a different result");
        // Never acknowledge a duplicate whose persisted result has become corrupt.
        await new AdviceRepository(tx).findRequest(lease.investigationId, lease.requestId);
        return { requestId: request.id, reused: true };
      }
      await this.assertLive(tx, lease);
      const repository = new AdviceRepository(tx);
      await repository.loadRequest(lease.investigationId, lease.requestId);
      const adviceId = result.kind === "COMPLETE" ? (await repository.createAdviceForRequest(lease.investigationId, lease.requestId, result.advice)).id : null;
      const issue = result.kind === "INSUFFICIENT_CONDITIONS" ? result.issue : null;
      const status = result.kind === "COMPLETE" ? "SUCCEEDED" : "INSUFFICIENT_CONDITIONS";
      await tx.$executeRaw`UPDATE "AdviceExecutionAttempt" SET "status" = ${status}::"AdviceAttemptStatus", "finishedAt" = clock_timestamp() WHERE "id" = ${lease.attemptId}::uuid`;
      // Expiry during result writes rolls back Advice, attempt AND request terminal state.
      const changed = await tx.$executeRaw`
        UPDATE "AdviceRequest" SET "status" = ${status}::"AdviceRequestStatus", "resultAdviceId" = ${adviceId}::uuid,
          "conditionsIssue" = CASE WHEN ${issue !== null} THEN ${JSON.stringify(issue)}::jsonb ELSE NULL END,
          "completionHash" = ${completionHash}, "lastError" = NULL, "error" = NULL,
          "completedAt" = clock_timestamp(), "updatedAt" = clock_timestamp(), "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL
        WHERE "id" = ${request.id}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${lease.executionToken}::uuid
          AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()`;
      if (changed !== 1) throw new LeaseLostError();
      return { requestId: request.id, reused: false };
    });
  }

  async fail(input: unknown, errorInput: unknown) {
    const lease = AdviceExecutionLeaseSchema.parse(input);
    const error = redactFailure(ErrorSchema.parse(errorInput));
    return this.transaction(async (tx) => {
      const request = await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      return this.recordFailure(tx, request, error, "FAILED", true);
    });
  }

  private async recordFailure(tx: Tx, request: AdviceRequest, error: DomainError, attemptStatus: "FAILED" | "LEASE_EXPIRED", requireLive: boolean) {
    const failures = request.failureCount + 1;
    const terminal = !error.retryable || failures >= request.maxAttempts;
    const backoff = Math.min(this.options.retryMaxMs, this.options.retryBaseMs * 2 ** Math.min(failures - 1, 20));
    const attempts = await tx.$executeRaw`
      UPDATE "AdviceExecutionAttempt" SET "status" = ${attemptStatus}::"AdviceAttemptStatus", "error" = ${JSON.stringify(error)}::jsonb, "finishedAt" = clock_timestamp()
      WHERE "requestId" = ${request.id}::uuid AND "executionToken" = ${request.executionToken}::uuid AND "status" = 'RUNNING'`;
    if (attempts !== 1) throw new LeaseLostError();
    const changed = await tx.$executeRaw`
      UPDATE "AdviceRequest" SET "status" = ${terminal ? "FAILED" : "PENDING"}::"AdviceRequestStatus", "failureCount" = ${failures},
        "lastError" = ${JSON.stringify(error)}::jsonb, "error" = CASE WHEN ${terminal} THEN ${JSON.stringify(error)}::jsonb ELSE NULL END,
        "availableAt" = clock_timestamp() + ${backoff} * interval '1 millisecond',
        "completedAt" = CASE WHEN ${terminal} THEN clock_timestamp() ELSE NULL END,
        "updatedAt" = clock_timestamp(), "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL
      WHERE "id" = ${request.id}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${request.executionToken}::uuid
        AND (${!requireLive} OR ("leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()))`;
    if (changed !== 1) throw new LeaseLostError();
    return { status: terminal ? "FAILED" as const : "PENDING" as const, failureCount: failures };
  }

  async recoverExpired(): Promise<number> {
    let recovered = 0;
    for (let i = 0; i < this.options.recoveryBatchSize; i++) {
      const found = await this.transaction(async (tx) => {
        const [request] = await tx.$queryRaw<AdviceRequest[]>`
          SELECT * FROM "AdviceRequest" WHERE "status" = 'RUNNING' AND ("leaseExpiresAt" <= clock_timestamp() OR "runDeadlineAt" <= clock_timestamp())
          ORDER BY "leaseExpiresAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED`;
        if (!request) return false;
        const rows = await tx.$queryRaw<{ timeout: boolean }[]>`
          SELECT "runDeadlineAt" <= clock_timestamp() AS timeout FROM "AdviceRequest" WHERE "id" = ${request.id}::uuid
            AND "status" = 'RUNNING' AND ("leaseExpiresAt" <= clock_timestamp() OR "runDeadlineAt" <= clock_timestamp())`;
        if (!rows[0]) return false;
        const timeout = rows[0].timeout;
        await this.recordFailure(tx, request, { code: timeout ? "TASK_TIMEOUT" : "LEASE_EXPIRED", message: timeout ? "Advice attempt exceeded its database deadline" : "Advice execution heartbeat lease expired", retryable: true }, "LEASE_EXPIRED", false);
        return true;
      });
      if (!found) break;
      recovered++;
    }
    return recovered;
  }
}
