ALTER TYPE "AttemptStatus" ADD VALUE 'AWAITING_CONFIRMATION';
ALTER TYPE "JobStatus" ADD VALUE 'AWAITING_CONFIRMATION';
ALTER TABLE "ExecutionAttempt" ADD COLUMN "stage" "InvestigationStage" NOT NULL DEFAULT 'CREATED';
ALTER TABLE "Job"
  ADD COLUMN "requestHash" CHAR(64),
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "runDeadlineAt" TIMESTAMPTZ(3),
  ADD COLUMN "confirmationRequest" JSONB,
  ADD COLUMN "confirmedIdentity" JSONB,
  ADD COLUMN "completionHash" CHAR(64),
  ADD COLUMN "publishedSnapshotId" UUID;
UPDATE "Job" j SET "requestHash" = encode(sha256(convert_to('question:v1:' || btrim(i."question"), 'UTF8')), 'hex')
FROM "Investigation" i WHERE i."id" = j."investigationId";
UPDATE "Job" SET "runDeadlineAt" = "leaseExpiresAt" WHERE "status" = 'RUNNING';
ALTER TABLE "Job" ALTER COLUMN "requestHash" SET NOT NULL;
ALTER TABLE "Job" DROP CONSTRAINT "Job_attempts_valid";
ALTER TABLE "Job" ADD CONSTRAINT "Job_attempts_valid" CHECK (
  "attemptCount" >= 0 AND "failureCount" >= 0 AND "maxAttempts" > 0 AND "failureCount" <= "maxAttempts"
);
ALTER TABLE "Job" ADD CONSTRAINT "Job_deadline_required" CHECK ("status" <> 'RUNNING' OR "runDeadlineAt" IS NOT NULL);
ALTER TABLE "Job" ADD CONSTRAINT "Job_request_hash_valid" CHECK ("requestHash" ~ '^[a-f0-9]{64}$');
CREATE UNIQUE INDEX "Job_investigationId_key" ON "Job"("investigationId");
CREATE UNIQUE INDEX "Job_publishedSnapshotId_key" ON "Job"("publishedSnapshotId");
ALTER TABLE "Job" ADD CONSTRAINT "Job_publishedSnapshotId_fkey" FOREIGN KEY ("publishedSnapshotId") REFERENCES "EvidenceSnapshot"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
