// Production adapter is activated after the document-reader integration commit.
export type { InvestigationContext, InvestigationHandler } from "./legacy-v3";
export { createV3InvestigationHandler as createInvestigationHandler } from "./legacy-v3";
import { createV3InvestigationHandler } from "./legacy-v3";
export const investigationHandler = createV3InvestigationHandler();
