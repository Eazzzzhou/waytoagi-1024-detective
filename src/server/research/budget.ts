import type { ModelCall, ResearchBudget, ResearchDepth } from "../../contracts";
import type { ModelProvider, ModelRequest } from "../models";

export const BUDGETS: Record<ResearchBudget["profile"], ResearchBudget> = {
  FACT: { profile: "FACT", totalMs: 120000, reserveMs: 35000, searchCalls: 6, documents: 8, selections: 14, modelCalls: 36, explorationTokens: 85000, totalTokens: 125000, maxCandidates: 120, maxActions: 65 },
  STANDARD: { profile: "STANDARD", totalMs: 360000, reserveMs: 75000, searchCalls: 18, documents: 24, selections: 36, modelCalls: 85, explorationTokens: 250000, totalTokens: 360000, maxCandidates: 300, maxActions: 150 },
  DEEP: { profile: "DEEP", totalMs: 600000, reserveMs: 120000, searchCalls: 30, documents: 40, selections: 60, modelCalls: 140, explorationTokens: 450000, totalTokens: 650000, maxCandidates: 500, maxActions: 200 },
  COMPARISON: { profile: "COMPARISON", totalMs: 180000, reserveMs: 45000, searchCalls: 6, documents: 10, selections: 18, modelCalls: 44, explorationTokens: 125000, totalTokens: 180000, maxCandidates: 160, maxActions: 80 }
};
/** Routing only; the model subsequently decomposes the actual user requirements. */
export function budgetFor(question: string, depth: ResearchDepth = "AUTO", env: Record<string, string | undefined> = process.env): ResearchBudget {
  if (env.RESEARCH_BUDGET_PRESET === "COMPARISON") return { ...BUDGETS.COMPARISON };
  const complex = /比较|对比|评测|评价|体验|适合|用于|用来|使用报告|限制|社区|优缺点|怎样|怎么样|how good|compare|review|versus|\bvs\b|blender|\bcad\b/i.test(question);
  return { ...BUDGETS[depth === "AUTO" ? complex ? "STANDARD" : "FACT" : depth] };
}

/** A raced deadline bounds adapters that ignore cancellation; callers still preserve journals. */
export async function bounded<T>(parent: AbortSignal, timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  parent.throwIfAborted();
  const controller = new AbortController();
  const signal = AbortSignal.any([parent, controller.signal]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([Promise.resolve().then(() => run(signal)), new Promise<never>((_, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => controller.abort(new DOMException("Research operation budget exhausted", "TimeoutError")), Math.max(1, timeoutMs));
    })]);
  } finally { clearTimeout(timer); if (abort) signal.removeEventListener("abort", abort); }
}

export function budgetModel(model: ModelProvider, budget: ResearchBudget, calls: ModelCall[], remaining: () => number) {
  let attempts = 0;
  const pendingEstimates = new Map<number, number>();
  const completedEstimates: number[] = [];
  const asOf = new Date().toISOString();
  let finalPhase = false;
  return {
    finishPhase: () => { finalPhase = true; },
    provider: {
      ...(model.config ? { config: () => model.config!() } : {}),
      async generate<T>(request: ModelRequest<T>): Promise<T> {
        const prompt = `本次调查时间为${asOf}。判断当前事实须核对生效/停用/过渡日期；历史或过渡期映射不自动延续至今，日期不明不得默认为当前。\n${request.prompt}`;
        // Reconcile completed calls with actual usage. Only pending/usage-less calls
        // retain estimates, so a known cheap call cannot permanently exhaust the budget.
        const measured = calls.reduce((sum, call) => sum + (call.inputTokens ?? 0) + (call.outputTokens ?? 0), 0);
        const known = calls.filter(call => call.inputTokens !== null && call.outputTokens !== null).length;
        const unknown = Math.max(0, completedEstimates.length - known);
        const unknownCost = [...completedEstimates].sort((a, b) => b - a).slice(0, unknown).reduce((sum, value) => sum + value, 0);
        const reserved = [...pendingEstimates.values()].reduce((sum, value) => sum + value, 0);
        const estimate = Math.ceil(prompt.length / 2) + 4000;
        const ceiling = finalPhase ? budget.totalTokens : budget.explorationTokens;
        const attemptCeiling = finalPhase ? budget.modelCalls : budget.modelCalls - Math.min(6, Math.floor(budget.modelCalls / 4));
        if (attempts >= attemptCeiling || measured + unknownCost + reserved + estimate > ceiling || remaining() < 150) throw new Error("Research model/token budget exhausted; unresolved items retained");
        const attempt = ++attempts;
        pendingEstimates.set(attempt, estimate);
        try { return await model.generate({ ...request, prompt, formatRepair: false }); }
        finally { pendingEstimates.delete(attempt); completedEstimates.push(estimate); }
      }
    } satisfies ModelProvider
  };
}
