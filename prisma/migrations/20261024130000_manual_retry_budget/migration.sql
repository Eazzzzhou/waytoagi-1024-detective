ALTER TABLE "Job" ADD COLUMN "manualRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD CONSTRAINT "Job_manual_retry_budget" CHECK ("manualRetryCount" BETWEEN 0 AND 2);
