-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_CONFIRMATION', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvestigationStage" AS ENUM ('CREATED', 'IDENTITY', 'RETRIEVAL', 'SOURCE_FETCH', 'VERIFICATION', 'ANSWER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'LEASE_EXPIRED');

-- CreateTable
CREATE TABLE "Investigation" (
    "id" UUID NOT NULL,
    "question" VARCHAR(4000) NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'PENDING',
    "stage" "InvestigationStage" NOT NULL DEFAULT 'CREATED',
    "error" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "resultSnapshotId" UUID,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "heartbeatAt" TIMESTAMPTZ(3),
    "executionToken" UUID,
    "lastError" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionAttempt" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "executionToken" UUID NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "error" JSONB,

    CONSTRAINT "ExecutionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSnapshot" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "parentSnapshotId" UUID,
    "contractVersion" VARCHAR(32) NOT NULL,
    "body" JSONB NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "body" JSONB NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advice" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "body" JSONB NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Advice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_resultSnapshotId_key" ON "Investigation"("resultSnapshotId");

-- CreateIndex
CREATE INDEX "Investigation_status_createdAt_idx" ON "Investigation"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_resultSnapshotId_id_key" ON "Investigation"("resultSnapshotId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Job_executionToken_key" ON "Job"("executionToken");

-- CreateIndex
CREATE INDEX "Job_status_availableAt_idx" ON "Job"("status", "availableAt");

-- CreateIndex
CREATE INDEX "Job_status_leaseExpiresAt_idx" ON "Job"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "Job_investigationId_createdAt_idx" ON "Job"("investigationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionAttempt_executionToken_key" ON "ExecutionAttempt"("executionToken");

-- CreateIndex
CREATE INDEX "ExecutionAttempt_jobId_startedAt_idx" ON "ExecutionAttempt"("jobId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionAttempt_jobId_attemptNumber_key" ON "ExecutionAttempt"("jobId", "attemptNumber");

-- CreateIndex
CREATE INDEX "EvidenceSnapshot_parentSnapshotId_investigationId_idx" ON "EvidenceSnapshot"("parentSnapshotId", "investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSnapshot_investigationId_version_key" ON "EvidenceSnapshot"("investigationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSnapshot_id_investigationId_key" ON "EvidenceSnapshot"("id", "investigationId");

-- CreateIndex
CREATE INDEX "Answer_snapshotId_generatedAt_idx" ON "Answer"("snapshotId", "generatedAt");

-- CreateIndex
CREATE INDEX "Advice_snapshotId_generatedAt_idx" ON "Advice"("snapshotId", "generatedAt");

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_resultSnapshotId_id_fkey" FOREIGN KEY ("resultSnapshotId", "id") REFERENCES "EvidenceSnapshot"("id", "investigationId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionAttempt" ADD CONSTRAINT "ExecutionAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_parentSnapshotId_investigationId_fkey" FOREIGN KEY ("parentSnapshotId", "investigationId") REFERENCES "EvidenceSnapshot"("id", "investigationId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EvidenceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advice" ADD CONSTRAINT "Advice_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EvidenceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Schema-level invariants intentionally maintained in SQL (Prisma cannot express CHECK/triggers).
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_question_nonempty" CHECK (length(btrim("question")) > 0);
ALTER TABLE "Job" ADD CONSTRAINT "Job_attempts_valid" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts");
ALTER TABLE "Job" ADD CONSTRAINT "Job_running_lease_required" CHECK (
  "status" <> 'RUNNING' OR ("executionToken" IS NOT NULL AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "heartbeatAt" IS NOT NULL)
);
ALTER TABLE "ExecutionAttempt" ADD CONSTRAINT "ExecutionAttempt_number_positive" CHECK ("attemptNumber" > 0);
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_version_parent_valid" CHECK (
  ("version" = 1 AND "parentSnapshotId" IS NULL) OR
  ("version" > 1 AND "parentSnapshotId" IS NOT NULL AND "parentSnapshotId" <> "id")
);

CREATE FUNCTION reject_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Evidence snapshots are immutable; create a new version instead' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER snapshot_immutable BEFORE UPDATE OR DELETE ON "EvidenceSnapshot"
FOR EACH ROW EXECUTE FUNCTION reject_snapshot_mutation();

CREATE FUNCTION check_snapshot_parent_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."parentSnapshotId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "EvidenceSnapshot" p WHERE p."id" = NEW."parentSnapshotId"
      AND p."investigationId" = NEW."investigationId" AND p."version" = NEW."version" - 1
  ) THEN
    RAISE EXCEPTION 'Snapshot parent must be the preceding version in the same investigation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_parent_version BEFORE INSERT ON "EvidenceSnapshot"
FOR EACH ROW EXECUTE FUNCTION check_snapshot_parent_version();
