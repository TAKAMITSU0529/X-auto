"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { runTrendAnalysis } from "@/lib/trends/service";
import { BudgetExceededError } from "@/lib/usage/guard";
import type { TrendAnalysisResult } from "@/lib/ai";

export type TrendState = {
  error: string | null;
  genre: string | null;
  result: TrendAnalysisResult | null;
  fetchedCount: number;
};

const schema = z.object({
  genre: z.string().trim().min(1, "ジャンルを入力してください").max(60),
});

export async function trendAnalyzeAction(
  _prev: TrendState,
  formData: FormData,
): Promise<TrendState> {
  const userId = await requireUserId();

  const parsed = schema.safeParse({ genre: formData.get("genre") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      genre: null,
      result: null,
      fetchedCount: 0,
    };
  }

  try {
    const run = await runTrendAnalysis({
      userId,
      genre: parsed.data.genre,
    });
    return {
      error: null,
      genre: parsed.data.genre,
      result: run.result,
      fetchedCount: run.fetchedCount,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, genre: null, result: null, fetchedCount: 0 };
    }
    return {
      error:
        error instanceof Error ? error.message : "トレンド分析に失敗しました",
      genre: null,
      result: null,
      fetchedCount: 0,
    };
  }
}
