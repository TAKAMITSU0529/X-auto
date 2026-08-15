"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  cancelScheduledPost,
  processDueScheduledPosts,
  schedulePost,
} from "@/lib/scheduling/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type ScheduleState = { error: string | null; success: string | null };

const scheduleSchema = z.object({
  generatedPostId: z.string().min(1),
  xAccountId: z.string().min(1, "投稿先の X アカウントを選んでください"),
  scheduledAtLocal: z.string().min(1, "予約日時を入力してください"),
  /** クライアントのタイムゾーンオフセット (分)。Date.getTimezoneOffset() の値 */
  tzOffsetMinutes: z.coerce.number().int().min(-840).max(840),
});

export async function schedulePostAction(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const userId = await requireUserId();

  const parsed = scheduleSchema.safeParse({
    generatedPostId: formData.get("generatedPostId"),
    xAccountId: formData.get("xAccountId"),
    scheduledAtLocal: formData.get("scheduledAtLocal"),
    tzOffsetMinutes: formData.get("tzOffsetMinutes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  // datetime-local はタイムゾーン情報を持たないため、クライアントの
  // オフセットを使って UTC に変換する (ユーザーの体感時刻どおりに予約する)
  const naive = Date.parse(`${parsed.data.scheduledAtLocal}:00Z`);
  if (Number.isNaN(naive)) {
    return { error: "予約日時の形式が不正です", success: null };
  }
  const scheduledAt = new Date(naive + parsed.data.tzOffsetMinutes * 60 * 1000);

  try {
    await schedulePost({
      userId,
      generatedPostId: parsed.data.generatedPostId,
      xAccountId: parsed.data.xAccountId,
      scheduledAt,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "予約に失敗しました",
      success: null,
    };
  }

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/generate");
  return { error: null, success: "予約しました" };
}

export async function cancelScheduleAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const scheduledPostId = String(formData.get("scheduledPostId") ?? "");

  await cancelScheduledPost({ userId, scheduledPostId });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export type RunNowState = { error: string | null; success: string | null };

/**
 * 期限が来た予約を今すぐ処理する (開発・デモ用)。
 * 本来は worker (`npm run worker`) が30秒ごとに処理する。
 */
export async function runDueNowAction(
  _prev: RunNowState,
  _formData: FormData,
): Promise<RunNowState> {
  await requireUserId();

  try {
    const result = await processDueScheduledPosts();
    revalidatePath("/schedule");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    return {
      error: null,
      success: `処理しました: 対象${result.processed}件 → 投稿${result.published} / リトライ${result.retried} / 失敗${result.failed}`,
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
