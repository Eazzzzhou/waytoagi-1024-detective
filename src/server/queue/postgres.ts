import { createHash, randomUUID } from "node:crypto";
import { Prisma, type Job, type PrismaClient } from "../../generated/prisma/client";
import { ErrorSchema, IdSchema, InvestigationStageSchema, TextSchema, type DomainError } from "../../contracts";
import { InvestigationRepository } from "../storage/repository";
import { QueueOptionsSchema, type QueueOptions } from "./config";
import { CompletionSchema, ConfirmationRequestSchema, ResumedIdentitySchema, EnqueueSchema, ExecutionLeaseSchema, type ExecutionLease } from "./contracts";
import { IdempotencyConflictError, LeaseLostError, redactFailure } from "./errors";
import { RetryBodySchema } from "../../contracts/http";
import { retryAvailability } from "./retry-policy";

type Tx = Prisma.TransactionClient;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** All ownership changes use short DB-only transactions. No provider code runs here. */
export class PostgresInvestigationQueue {
  readonly options: QueueOptions;
  constructor(private readonly db: PrismaClient, options: Partial<QueueOptions> = {}) {
    this.options = QueueOptionsSchema.parse(options);
  }

  private transaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '2s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '4s'`;
      return run(tx);
    }, { maxWait: 5000, timeout: 5000 });
  }

  async enqueue(input: unknown) {
    const request = EnqueueSchema.parse(input);
    const requestHash = hash(`question:v1:${request.question}`);
    return this.transaction(async (tx) => {
      // Serializes creation for the same key before creating an investigation. Unique index is the final guard.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`enqueue:${request.idempotencyKey}`}, 0))::text`;
      const existing = await tx.job.findUnique({ where: { idempotencyKey: request.idempotencyKey } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new IdempotencyConflictError();
        return { investigation: await new InvestigationRepository(tx).findInvestigation(existing.investigationId), jobId: existing.id, reused: true };
      }
      const investigation = await new InvestigationRepository(tx).createInvestigation({ question: request.question });
      const job = await tx.job.create({ data: { investigationId: investigation.id, idempotencyKey: request.idempotencyKey, requestHash, maxAttempts: this.options.maxAttempts } });
      return { investigation, jobId: job.id, reused: false };
    });
  }

  async claim(workerInput: unknown): Promise<ExecutionLease | null> {
    const workerId = TextSchema.max(200).parse(workerInput);
    return this.transaction(async (tx) => {
      const [candidate] = await tx.$queryRaw<Job[]>`
        SELECT j.* FROM "Job" j JOIN "Investigation" i ON i."id" = j."investigationId"
        WHERE j."status" = 'PENDING' AND i."status" = 'PENDING'
          AND j."availableAt" <= clock_timestamp() AND j."failureCount" < j."maxAttempts"
        ORDER BY j."availableAt", j."createdAt", j."id" LIMIT 1 FOR UPDATE OF j SKIP LOCKED`;
      if (!candidate) return null;
      const token = randomUUID();
      const [job] = await tx.$queryRaw<Job[]>`
        UPDATE "Job" SET "status" = 'RUNNING', "attemptCount" = "attemptCount" + 1,
          "executionToken" = ${token}::uuid, "leaseOwner" = ${workerId}, "heartbeatAt" = clock_timestamp(),
          "runDeadlineAt" = clock_timestamp() + ${this.options.attemptTimeoutMs} * interval '1 millisecond',
          "leaseExpiresAt" = clock_timestamp() + ${Math.min(this.options.leaseMs, this.options.attemptTimeoutMs)} * interval '1 millisecond',
          "updatedAt" = clock_timestamp(), "completedAt" = NULL
        WHERE "id" = ${candidate.id}::uuid RETURNING *`;
      if (!job?.leaseExpiresAt) throw new Error("Claim did not produce a lease");
      const now = await this.now(tx);
      const attempt = await tx.executionAttempt.create({ data: { jobId: job.id, attemptNumber: job.attemptCount, executionToken: token, workerId, startedAt: now, heartbeatAt: now } });
      await tx.investigation.update({ where: { id: job.investigationId }, data: { status: "RUNNING", stage: "CREATED", error: PrismaJsonNull, completedAt: null, updatedAt: now } });
      await tx.$executeRaw`UPDATE "Investigation" SET "startedAt" = COALESCE("startedAt", clock_timestamp()) WHERE "id" = ${job.investigationId}::uuid`;
      return ExecutionLeaseSchema.parse({ jobId: job.id, investigationId: job.investigationId, attemptId: attempt.id, executionToken: token, workerId, expiresAt: job.leaseExpiresAt });
    });
  }

  private async now(tx: Tx): Promise<Date> {
    const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp()::timestamptz(3) AS now`;
    return row!.now;
  }

  private async lockOwned(tx: Tx, lease: ExecutionLease): Promise<Job> {
    const [job] = await tx.$queryRaw<Job[]>`
      SELECT j.* FROM "Job" j JOIN "ExecutionAttempt" a ON a."jobId" = j."id" AND a."executionToken" = j."executionToken"
      WHERE j."id" = ${lease.jobId}::uuid AND j."investigationId" = ${lease.investigationId}::uuid
        AND j."executionToken" = ${lease.executionToken}::uuid AND j."leaseOwner" = ${lease.workerId}
        AND a."id" = ${lease.attemptId}::uuid AND a."workerId" = ${lease.workerId}
      FOR UPDATE OF j`;
    if (!job) throw new LeaseLostError();
    return job;
  }

  private async assertLive(tx: Tx, lease: ExecutionLease) {
    // Separate query AFTER acquiring the row lock: time spent waiting for the lock must count.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Job" WHERE "id" = ${lease.jobId}::uuid AND "status" = 'RUNNING'
        AND "executionToken" = ${lease.executionToken}::uuid
        AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()`;
    if (!rows.length) throw new LeaseLostError();
  }

  async heartbeat(input: unknown): Promise<ExecutionLease> {
    const lease = ExecutionLeaseSchema.parse(input);
    return this.transaction(async (tx) => {
      await this.lockOwned(tx, lease);
      const [job] = await tx.$queryRaw<Job[]>`
        UPDATE "Job" SET "heartbeatAt" = clock_timestamp(), "updatedAt" = clock_timestamp(),
          "leaseExpiresAt" = LEAST(clock_timestamp() + ${this.options.leaseMs} * interval '1 millisecond', "runDeadlineAt")
        WHERE "id" = ${lease.jobId}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${lease.executionToken}::uuid
          AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp() RETURNING *`;
      if (!job?.leaseExpiresAt || !job.heartbeatAt) throw new LeaseLostError();
      await tx.executionAttempt.update({ where: { id: lease.attemptId }, data: { heartbeatAt: job.heartbeatAt } });
      return { ...lease, expiresAt: job.leaseExpiresAt };
    });
  }

  async loadTask(input: unknown) {
    const lease = ExecutionLeaseSchema.parse(input);
    return this.transaction(async (tx) => {
      const job = await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      const investigation = await new InvestigationRepository(tx).findInvestigation(job.investigationId);
      if (!investigation) throw new Error("Investigation is missing");
      const confirmedIdentity = job.confirmedIdentity === null ? null : ResumedIdentitySchema.parse(job.confirmedIdentity);
      return { investigation, confirmedIdentity };
    });
  }

  async advanceStage(input: unknown, stageInput: unknown) {
    const lease = ExecutionLeaseSchema.parse(input);
    const stage = InvestigationStageSchema.exclude(["COMPLETED"]).parse(stageInput);
    await this.transaction(async (tx) => {
      await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      await tx.investigation.update({ where: { id: lease.investigationId }, data: { stage, updatedAt: await this.now(tx) } });
      await tx.executionAttempt.update({ where: { id: lease.attemptId }, data: { stage } });
      await this.assertLive(tx, lease);
    });
  }

  async complete(input: unknown, resultInput: unknown) {
    const lease = ExecutionLeaseSchema.parse(input);
    const result = CompletionSchema.parse(resultInput);
    if (result.snapshot.investigationId !== lease.investigationId) throw new IdempotencyConflictError("Completion belongs to a different investigation");
    const completionHash = hash(JSON.stringify(result));
    return this.transaction(async (tx) => {
      const job = await this.lockOwned(tx, lease);
      if (job.status === "SUCCEEDED") {
        if (job.completionHash !== completionHash || job.publishedSnapshotId !== result.snapshot.id) throw new IdempotencyConflictError("Completed job received a different result");
        return { snapshotId: job.publishedSnapshotId, reused: true };
      }
      await this.assertLive(tx, lease);
      const repository = new InvestigationRepository(tx);
      await repository.createSnapshot(result.snapshot);
      await repository.createAnswer(result.answer);
      const now = await this.now(tx);
      await tx.investigation.update({ where: { id: job.investigationId }, data: { status: "SUCCEEDED", stage: "COMPLETED", error: PrismaJsonNull, completedAt: now, updatedAt: now, resultSnapshotId: result.snapshot.id } });
      await tx.executionAttempt.update({ where: { id: lease.attemptId }, data: { status: "SUCCEEDED", stage: "COMPLETED", finishedAt: now } });
      // Last guarded write: expiry during JSONB writes rolls back snapshots, answer AND state.
      const changed = await tx.$executeRaw`
        UPDATE "Job" SET "status" = 'SUCCEEDED', "completionHash" = ${completionHash}, "publishedSnapshotId" = ${result.snapshot.id}::uuid,
          "completedAt" = clock_timestamp(), "updatedAt" = clock_timestamp(), "lastError" = NULL,
          "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL
        WHERE "id" = ${job.id}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${lease.executionToken}::uuid
          AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()`;
      if (changed !== 1) throw new LeaseLostError();
      return { snapshotId: result.snapshot.id, reused: false };
    });
  }

  async awaitConfirmation(input: unknown, requestInput: unknown) {
    const lease = ExecutionLeaseSchema.parse(input);
    const request = ConfirmationRequestSchema.parse(requestInput);
    await this.transaction(async (tx) => {
      await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      const now = await this.now(tx);
      await tx.executionAttempt.update({ where: { id: lease.attemptId }, data: { status: "AWAITING_CONFIRMATION", stage: "IDENTITY", finishedAt: now } });
      await tx.investigation.update({ where: { id: lease.investigationId }, data: { status: "AWAITING_CONFIRMATION", stage: "IDENTITY", updatedAt: now } });
      const changed = await tx.$executeRaw`
        UPDATE "Job" SET "status" = ${"AWAITING_CONFIRMATION"}::"JobStatus", "confirmationRequest" = ${JSON.stringify(request)}::jsonb,
          "confirmedIdentity" = NULL, "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL, "updatedAt" = clock_timestamp()
        WHERE "id" = ${lease.jobId}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${lease.executionToken}::uuid
          AND "leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()`;
      if (changed !== 1) throw new LeaseLostError();
    });
  }

  async confirmIdentity(investigationInput: unknown, identityInput: unknown, control?: { requireWaiting: true; expectedAttemptCount: number }) {
    const investigationId = IdSchema.parse(investigationInput);
    const identity = ResumedIdentitySchema.parse(identityInput);
    return this.transaction(async (tx) => {
      const [job] = await tx.$queryRaw<Job[]>`SELECT * FROM "Job" WHERE "investigationId" = ${investigationId}::uuid FOR UPDATE`;
      if (!job) throw new IdempotencyConflictError("Investigation has no queued job");
      if (control) {
        const { expectedAttemptCount } = RetryBodySchema.parse({ expectedAttemptCount: control.expectedAttemptCount });
        const investigation = await new InvestigationRepository(tx).findInvestigation(investigationId);
        if (job.status !== "AWAITING_CONFIRMATION" || investigation?.status !== "AWAITING_CONFIRMATION" || job.attemptCount !== expectedAttemptCount) throw new IdempotencyConflictError("身份确认请求已被处理或已发生变化，请刷新调查。");
      }
      if (job.status !== "AWAITING_CONFIRMATION") {
        if (job.confirmedIdentity !== null && JSON.stringify(ResumedIdentitySchema.parse(job.confirmedIdentity)) === JSON.stringify(identity)) return { jobId: job.id, reused: true };
        throw new IdempotencyConflictError("Investigation is not awaiting identity confirmation");
      }
      ConfirmationRequestSchema.parse(job.confirmationRequest);
      await tx.$executeRaw`UPDATE "Job" SET "status" = 'PENDING', "confirmedIdentity" = ${JSON.stringify(identity)}::jsonb,
        "availableAt" = clock_timestamp(), "updatedAt" = clock_timestamp() WHERE "id" = ${job.id}::uuid`;
      await tx.investigation.update({ where: { id: investigationId }, data: { status: "PENDING", updatedAt: await this.now(tx) } });
      return { jobId: job.id, reused: false };
    });
  }

  private backoff(failures: number) {
    return Math.min(this.options.retryMaxMs, this.options.retryBaseMs * 2 ** Math.min(failures - 1, 20));
  }

  /** Explicit user action: grant one additional attempt, at most twice, without resetting history. */
  async retryFailed(investigationInput: unknown, retryInput: unknown) {
    const investigationId = IdSchema.parse(investigationInput);
    const { expectedAttemptCount } = RetryBodySchema.parse(retryInput);
    return this.transaction(async (tx) => {
      const [job] = await tx.$queryRaw<Job[]>`SELECT * FROM "Job" WHERE "investigationId" = ${investigationId}::uuid FOR UPDATE`;
      const investigation = await new InvestigationRepository(tx).findInvestigation(investigationId);
      if (!job || !investigation) throw new IdempotencyConflictError("调查没有可重试的任务。");
      const availability = retryAvailability(job, investigation.status);
      if (!availability.allowed || job.attemptCount !== expectedAttemptCount) throw new IdempotencyConflictError(job.attemptCount !== expectedAttemptCount ? "执行记录已变化，请刷新后重试。" : availability.reason);
      await tx.$executeRaw`UPDATE "Job" SET "status" = 'PENDING', "maxAttempts" = "maxAttempts" + 1,
        "manualRetryCount" = "manualRetryCount" + 1, "availableAt" = clock_timestamp(), "completedAt" = NULL,
        "executionToken" = NULL, "leaseOwner" = NULL, "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL,
        "heartbeatAt" = NULL, "updatedAt" = clock_timestamp() WHERE "id" = ${job.id}::uuid`;
      await tx.investigation.update({ where: { id: investigationId }, data: { status: "PENDING", completedAt: null, updatedAt: await this.now(tx) } });
      return { investigationId, reused: false };
    });
  }

  async fail(input: unknown, errorInput: unknown) {
    const lease = ExecutionLeaseSchema.parse(input);
    const error = redactFailure(ErrorSchema.parse(errorInput));
    return this.transaction(async (tx) => {
      const job = await this.lockOwned(tx, lease);
      await this.assertLive(tx, lease);
      return this.recordFailure(tx, job, error, "FAILED", lease);
    });
  }

  private async recordFailure(tx: Tx, job: Job, error: DomainError, attemptStatus: "FAILED" | "LEASE_EXPIRED", lease?: ExecutionLease) {
    if (!job.executionToken) throw new LeaseLostError();
    const failures = job.failureCount + 1;
    const terminal = !error.retryable || failures >= job.maxAttempts;
    const now = await this.now(tx);
    await tx.executionAttempt.updateMany({ where: { jobId: job.id, executionToken: job.executionToken, status: "RUNNING" }, data: { status: attemptStatus, error, finishedAt: now } });
    await tx.investigation.update({ where: { id: job.investigationId }, data: { status: terminal ? "FAILED" : "PENDING", error, completedAt: terminal ? now : null, updatedAt: now } });
    const changed = await tx.$executeRaw`
      UPDATE "Job" SET "status" = ${terminal ? "FAILED" : "PENDING"}::"JobStatus", "failureCount" = ${failures},
        "lastError" = ${JSON.stringify(error)}::jsonb, "availableAt" = clock_timestamp() + ${this.backoff(failures)} * interval '1 millisecond',
        "completedAt" = CASE WHEN ${terminal} THEN clock_timestamp() ELSE NULL END,
        "leaseExpiresAt" = NULL, "runDeadlineAt" = NULL, "updatedAt" = clock_timestamp()
      WHERE "id" = ${job.id}::uuid AND "status" = 'RUNNING' AND "executionToken" = ${job.executionToken}::uuid
        AND (${lease === undefined} OR ("leaseExpiresAt" > clock_timestamp() AND "runDeadlineAt" > clock_timestamp()))`;
    if (changed !== 1) throw new LeaseLostError();
    return { status: terminal ? "FAILED" as const : "PENDING" as const, failureCount: failures };
  }

  async recoverExpired(): Promise<number> {
    let recovered = 0;
    for (let index = 0; index < this.options.recoveryBatchSize; index++) {
      const found = await this.transaction(async (tx) => {
        const [job] = await tx.$queryRaw<Job[]>`
          SELECT * FROM "Job" WHERE "status" = 'RUNNING'
            AND ("leaseExpiresAt" <= clock_timestamp() OR "runDeadlineAt" <= clock_timestamp())
          ORDER BY "leaseExpiresAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED`;
        if (!job) return false;
        // Check again after locking, so a concurrent heartbeat cannot be reclaimed from a stale read.
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Job" WHERE "id" = ${job.id}::uuid
          AND "status" = 'RUNNING' AND ("leaseExpiresAt" <= clock_timestamp() OR "runDeadlineAt" <= clock_timestamp())`;
        if (!rows.length) return false;
        const now = await this.now(tx);
        const timeout = job.runDeadlineAt !== null && job.runDeadlineAt <= now;
        await this.recordFailure(tx, job, { code: timeout ? "TASK_TIMEOUT" : "LEASE_EXPIRED", message: timeout ? "Attempt exceeded its database deadline" : "Worker heartbeat lease expired; execution may have been interrupted", retryable: true }, "LEASE_EXPIRED");
        return true;
      });
      if (!found) break;
      recovered++;
    }
    return recovered;
  }
}

// Nullable JSON fields require Prisma.DbNull instead of a JavaScript null.
const PrismaJsonNull = Prisma.DbNull;
