"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { processMetricSnapshots } from "@/lib/analytics/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type SnapshotState = { error: string | null; success: string | null };

/**
 * スナップショット取得を今すぐ実行する (開発・デモ用)。
 * 本来は worker (`npm run worker`) が5分ごとに処理する。
 */
export async function runSnapshotsNowAction(
  _prev: SnapshotState,
  _formData: FormData,
): Promise<SnapshotState> {
  await requireUserId();

  try {
    const result = await processMetricSnapshots();
    revalidatePath("/analytics");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: `確認 ${result.checked} 投稿 → 記録 ${result.captured} 件（窓逃し ${result.skippedMissedWindow} / エラー ${result.errors}）`,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, success: null };
    }
    return {
      error: error instanceof Error ? error.message : "処理に失敗しました",
      success: null,
    };
  }
}
