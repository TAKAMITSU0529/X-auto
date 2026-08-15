"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { runPositioning } from "@/lib/positioning/service";
import { BudgetExceededError } from "@/lib/usage/guard";
import type { PositioningResult } from "@/lib/ai";

export type PositioningState = {
  error: string | null;
  genre: string | null;
  result: PositioningResult | null;
  competitorCount: number;
};

const schema = z.object({
  genre: z.string().trim().min(1, "ジャンルを入力してください").max(60),
});

export async function positioningAction(
  _prev: PositioningState,
  formData: FormData,
): Promise<PositioningState> {
  const userId = await requireUserId();

  const parsed = schema.safeParse({ genre: formData.get("genre") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      genre: null,
      result: null,
      competitorCount: 0,
    };
  }

  try {
    const run = await runPositioning({ userId, genre: parsed.data.genre });
    return {
      error: null,
      genre: parsed.data.genre,
      result: run.result,
      competitorCount: run.competitorCount,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, genre: null, result: null, competitorCount: 0 };
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "ポジショニング分析に失敗しました",
      genre: null,
      result: null,
      competitorCount: 0,
    };
  }
}
