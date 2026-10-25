ALTER TABLE "Investigation" ADD COLUMN "researchDepth" VARCHAR(16) NOT NULL DEFAULT 'AUTO';
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_researchDepth_check" CHECK ("researchDepth" IN ('AUTO', 'FACT', 'STANDARD', 'DEEP'));
