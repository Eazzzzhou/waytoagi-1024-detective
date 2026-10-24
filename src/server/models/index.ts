import type { z } from "zod";
import { unavailable } from "../errors";

export interface ModelProvider {
  generate<T>(request: { prompt: string; outputSchema: z.ZodType<T> }): Promise<T>;
}
export const modelProvider: ModelProvider = { generate: () => unavailable("model") };
// Implementations must parse the unknown model response with request.outputSchema.
