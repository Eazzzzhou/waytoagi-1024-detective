import type { Advice, EvidenceSnapshot, UserConditions } from "../../contracts";
import { unavailable } from "../errors";

export interface RecommendationProvider { generate(snapshot: EvidenceSnapshot, conditions: UserConditions): Promise<Advice> }
export const recommendationProvider: RecommendationProvider = { generate: () => unavailable("recommendation") };
