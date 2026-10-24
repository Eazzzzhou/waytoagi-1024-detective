import type { InvestigationStage, ProductIdentity } from "../../contracts";
import type { HandlerResult } from "../queue/contracts";
import { unavailable } from "../errors";

export interface InvestigationContext {
  investigationId: string;
  question: string;
  confirmedIdentity: ProductIdentity | null;
  signal: AbortSignal;
  setStage(stage: Exclude<InvestigationStage, "COMPLETED">): Promise<void>;
}
export type InvestigationHandler = (context: InvestigationContext) => Promise<HandlerResult>;

/** Production entry point for teammate 甲. No test processor or synthetic evidence is wired here. */
export const investigationHandler: InvestigationHandler = async (context) => {
  context.signal.throwIfAborted();
  await context.setStage("IDENTITY");
  return unavailable("investigation orchestration");
};
