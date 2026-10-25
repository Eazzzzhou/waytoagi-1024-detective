import type { AdviceRequest, EvidenceSnapshot } from "../contracts";
import type { AdviceHandlerResult } from "../server/queue/advice-contracts";
import { recommendationProvider, type RecommendationProvider } from "../server/recommendation";

export interface AdviceContext {
  request: AdviceRequest;
  snapshot: EvidenceSnapshot;
  signal: AbortSignal;
}
/** Teammate 甲 plugs in an adapter honoring signal; output is always runtime-validated. */
export type AdviceHandler = (context: AdviceContext) => Promise<AdviceHandlerResult>;

export function createAdviceHandler(provider: RecommendationProvider = recommendationProvider): AdviceHandler {
  return async context => {
    context.signal.throwIfAborted();
    return provider.execute(context.snapshot, context.request.userConditions, { signal: context.signal });
  };
}
export const adviceHandler = createAdviceHandler();
