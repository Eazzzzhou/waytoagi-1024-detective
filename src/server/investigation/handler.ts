import { resolve } from "node:path";
import { createResearchHandler, type ResearchDependencies } from "../research/engine";
import { createDocumentReader, SourceDocumentSchema } from "../retrieval/documents";
import { createV3InvestigationHandler } from "./legacy-v3";
export type { InvestigationContext, InvestigationHandler } from "./legacy-v3";

/** Lifecycle adapter only; research policy lives in the research module. */
export function createInvestigationHandler(options: Partial<ResearchDependencies> = {}) {
  return createResearchHandler({ ...options, reader: options.reader ?? (({ signal, investigationId }) => {
    const reader = createDocumentReader({ signal, timeoutMs: 660000,
      storageDir: resolve(process.env.SOURCE_DOCUMENT_DIRECTORY ?? ".cache/source-documents-v4", investigationId) });
    return {
      read: reader.read, load: reader.load, journal: reader.journal,
      select: (document, input) => reader.select(SourceDocumentSchema.parse(document), input),
      toEvidence: (document, fragment, input) => reader.toEvidence(SourceDocumentSchema.parse(document), fragment, input)
    };
  }) });
}

const v4 = createInvestigationHandler();
const v3 = createV3InvestigationHandler({ availableEntries: ["yuanbao", "tavily"], totalBudgetMs: 180000, answerReserveMs: 45000, maxReads: 10, maxSearchRounds: 3 });
export const investigationHandler: import("./legacy-v3").InvestigationHandler = context =>
  (process.env.RESEARCH_ENGINE_VERSION === "v3" ? v3 : v4)(context);
