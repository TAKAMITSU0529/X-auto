"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  cancelScheduledPost,
  processDueScheduledPosts,
  schedulePost,
} from "@/lib/scheduling/service";
import {
  applyImprovedText,
  runPreCheck,
  type PreCheckReport,
} from "@/lib/generation/precheck";
import { BudgetExceededError } from "@/lib/usage/guard";

export type ScheduleState = { error: string | null; success: string | null };

const scheduleSchema = z.object({
  generatedPostId: z.string().min(1),
  xAccountId: z.string().min(1, "投稿先の X アカウントを選んでください"),
  scheduledAtLocal: z.string().min(1, "予約日時を入力してください"),
  /** クライアントのタイムゾーンオフセット (分)。Date.getTimezoneOffset() の値 */
  tzOffsetMinutes: z.coerce.number().int().min(-840).max(840),
  /** スレッド (2投稿目以降)。空行2つ区切りで複数投稿 */
  threadText: z.string().trim().max(8000).optional(),
  /** 画像URL (改行・カンマ区切り、最大4) */
  mediaUrlsText: z.string().trim().max(2000).optional(),
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
    threadText: formData.get("threadText") || undefined,
    mediaUrlsText: formData.get("mediaUrlsText") || undefined,
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

  // スレッド: 空行2つ (以上) で区切って複数投稿に分割する
  const threadTexts = (parsed.data.threadText ?? "")
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (threadTexts.some((t) => t.length > 280)) {
    return {
      error: "スレッドの各投稿は280文字以内にしてください",
      success: null,
    };
  }

  const mediaUrls = (parsed.data.mediaUrlsText ?? "")
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
  if (mediaUrls.some((u) => !/^https?:\/\//.test(u))) {
    return {
      error: "画像URLは http(s):// で始まるURLを指定してください",
      success: null,
    };
  }

  try {
    await schedulePost({
      userId,
      generatedPostId: parsed.data.generatedPostId,
      xAccountId: parsed.data.xAccountId,
      scheduledAt,
      threadTexts,
      mediaUrls,
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

export type PreCheckState = {
  error: string | null;
  report: PreCheckReport | null;
};

/** 投稿前AIチェックを実行する (F-07 拡張) */
export async function preCheckAction(
  _prev: PreCheckState,
  formData: FormData,
): Promise<PreCheckState> {
  const userId = await requireUserId();
  const generatedPostId = String(formData.get("generatedPostId") ?? "");

  try {
    const report = await runPreCheck({ userId, generatedPostId });
    return { error: null, report };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, report: null };
    }
    return {
      error: error instanceof Error ? error.message : "チェックに失敗しました",
      report: null,
    };
  }
}

export type ApplyImprovedState = { error: string | null; success: string | null };

/** 「AIでもっと強くする」: 改善版本文で下書きを差し替える */
export async function applyImprovedAction(
  _prev: ApplyImprovedState,
  formData: FormData,
): Promise<ApplyImprovedState> {
  const userId = await requireUserId();

  try {
    await applyImprovedText({
      userId,
      generatedPostId: String(formData.get("generatedPostId") ?? ""),
      improvedText: String(formData.get("improvedText") ?? ""),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "差し替えに失敗しました",
      success: null,
    };
  }

  revalidatePath("/schedule");
  revalidatePath("/generate");
  return { error: null, success: "改善版に差し替えました" };
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
