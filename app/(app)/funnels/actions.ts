"use server";

import { requireUserId } from "@/lib/auth";
import { runFunnelAnalysis } from "@/lib/funnels/service";
import { BudgetExceededError } from "@/lib/usage/guard";
import type { FunnelAnalysisResult } from "@/lib/ai";

export type FunnelState = {
  error: string | null;
  result: FunnelAnalysisResult | null;
  competitorCount: number;
};

export async function funnelAction(
  _prev: FunnelState,
  _formData: FormData,
): Promise<FunnelState> {
  const userId = await requireUserId();

  try {
    const run = await runFunnelAnalysis({ userId });
    return {
      error: null,
      result: run.result,
      competitorCount: run.competitorCount,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, result: null, competitorCount: 0 };
    }
    return {
      error:
        error instanceof Error ? error.message : "動線分析に失敗しました",
      result: null,
      competitorCount: 0,
    };
  }
}
