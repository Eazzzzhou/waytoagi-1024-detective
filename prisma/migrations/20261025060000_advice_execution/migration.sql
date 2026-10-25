CREATE TYPE "AdviceAttemptStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'INSUFFICIENT_CONDITIONS', 'FAILED', 'LEASE_EXPIRED');
ALTER TABLE "AdviceRequest"
  ADD COLUMN "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "heartbeatAt" TIMESTAMPTZ(3),
  ADD COLUMN "runDeadlineAt" TIMESTAMPTZ(3),
  ADD COLUMN "executionToken" UUID,
  ADD COLUMN "completionHash" CHAR(64),
  ADD COLUMN "lastError" JSONB;
-- Before this migration there was no advice executor or lease. Any old RUNNING row
-- has no recoverable owner; queue it without changing completed results or inputs.
UPDATE "AdviceRequest" SET "status" = 'PENDING', "updatedAt" = clock_timestamp(),
  "lastError" = '{"code":"LEASE_EXPIRED","message":"Task predates advice execution leases; queued for recovery","retryable":true}'::jsonb
  WHERE "status" = 'RUNNING';
ALTER TABLE "AdviceRequest"
  ADD CONSTRAINT "AdviceRequest_attempts_valid" CHECK ("attemptCount" >= 0 AND "failureCount" >= 0 AND "failureCount" <= "attemptCount" AND "maxAttempts" BETWEEN 1 AND 20 AND "failureCount" <= "maxAttempts"),
  ADD CONSTRAINT "AdviceRequest_running_lease_required" CHECK ("status" <> 'RUNNING' OR ("executionToken" IS NOT NULL AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "heartbeatAt" IS NOT NULL AND "runDeadlineAt" IS NOT NULL)),
  ADD CONSTRAINT "AdviceRequest_completion_hash_valid" CHECK ("completionHash" IS NULL OR "completionHash" ~ '^[a-f0-9]{64}$');
CREATE UNIQUE INDEX "AdviceRequest_executionToken_key" ON "AdviceRequest"("executionToken");
CREATE INDEX "AdviceRequest_status_availableAt_idx" ON "AdviceRequest"("status", "availableAt");
CREATE INDEX "AdviceRequest_status_leaseExpiresAt_idx" ON "AdviceRequest"("status", "leaseExpiresAt");
CREATE TABLE "AdviceExecutionAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "executionToken" UUID NOT NULL,
  "workerId" TEXT NOT NULL,
  "status" "AdviceAttemptStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heartbeatAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMPTZ(3),
  "error" JSONB,
  CONSTRAINT "AdviceExecutionAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdviceExecutionAttempt_number_positive" CHECK ("attemptNumber" > 0),
  CONSTRAINT "AdviceExecutionAttempt_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AdviceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AdviceExecutionAttempt_executionToken_key" ON "AdviceExecutionAttempt"("executionToken");
CREATE UNIQUE INDEX "AdviceExecutionAttempt_requestId_attemptNumber_key" ON "AdviceExecutionAttempt"("requestId", "attemptNumber");
CREATE INDEX "AdviceExecutionAttempt_requestId_startedAt_idx" ON "AdviceExecutionAttempt"("requestId", "startedAt");
