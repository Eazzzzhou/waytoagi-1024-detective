-- Generate IDs at the database boundary, including raw SQL writers and composite relations.
ALTER TABLE "Investigation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Job" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ExecutionAttempt" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
