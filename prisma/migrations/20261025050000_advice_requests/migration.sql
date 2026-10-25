-- Add an independent advice task scope; the one-investigation/one-Job queue is unchanged.
CREATE TYPE "AdviceRequestStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'INSUFFICIENT_CONDITIONS', 'FAILED');
CREATE UNIQUE INDEX "Advice_id_snapshotId_key" ON "Advice"("id", "snapshotId");
CREATE TABLE "AdviceRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" VARCHAR(32) NOT NULL DEFAULT 'ADVICE',
  "investigationId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "userConditions" JSONB NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "status" "AdviceRequestStatus" NOT NULL DEFAULT 'PENDING',
  "resultAdviceId" UUID,
  "conditionsIssue" JSONB,
  "error" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AdviceRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdviceRequest_type_valid" CHECK ("type" = 'ADVICE'),
  CONSTRAINT "AdviceRequest_key_valid" CHECK (length(btrim("idempotencyKey")) > 0),
  CONSTRAINT "AdviceRequest_hash_valid" CHECK ("requestHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "AdviceRequest_conditions_object" CHECK (jsonb_typeof("userConditions") = 'object'),
  CONSTRAINT "AdviceRequest_state_valid" CHECK (
    (("status" IN ('SUCCEEDED', 'INSUFFICIENT_CONDITIONS', 'FAILED')) = ("completedAt" IS NOT NULL)) AND
    (("status" = 'SUCCEEDED') = ("resultAdviceId" IS NOT NULL)) AND
    (("status" = 'FAILED') = ("error" IS NOT NULL)) AND
    (("status" = 'INSUFFICIENT_CONDITIONS') = ("conditionsIssue" IS NOT NULL))
  ),
  CONSTRAINT "AdviceRequest_timestamps_valid" CHECK ("updatedAt" >= "createdAt" AND ("completedAt" IS NULL OR "completedAt" >= "createdAt")),
  CONSTRAINT "AdviceRequest_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdviceRequest_snapshotId_investigationId_fkey" FOREIGN KEY ("snapshotId", "investigationId") REFERENCES "EvidenceSnapshot"("id", "investigationId") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "AdviceRequest_resultAdviceId_snapshotId_fkey" FOREIGN KEY ("resultAdviceId", "snapshotId") REFERENCES "Advice"("id", "snapshotId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "AdviceRequest_investigationId_idempotencyKey_key" ON "AdviceRequest"("investigationId", "idempotencyKey");
CREATE UNIQUE INDEX "AdviceRequest_resultAdviceId_key" ON "AdviceRequest"("resultAdviceId");
CREATE UNIQUE INDEX "AdviceRequest_resultAdviceId_snapshotId_key" ON "AdviceRequest"("resultAdviceId", "snapshotId");
CREATE INDEX "AdviceRequest_status_createdAt_idx" ON "AdviceRequest"("status", "createdAt");
CREATE INDEX "AdviceRequest_snapshotId_createdAt_idx" ON "AdviceRequest"("snapshotId", "createdAt");
