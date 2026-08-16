"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { reschedulePostDate } from "@/lib/calendar/service";
import {
  MAX_PLAN_COUNT,
  createContentPlan,
  deletePlannedIdea,
} from "@/lib/plan/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type RescheduleResult = { error: string | null };

/** カレンダーの D&D から呼ばれる: 予約の日付だけを変更する (時刻は維持) */
export async function reschedulePostAction(
  scheduledPostId: string,
  targetDateKey: string,
): Promise<RescheduleResult> {
  const userId = await requireUserId();

  try {
    await reschedulePostDate({ userId, scheduledPostId, targetDateKey });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "移動に失敗しました",
    };
  }

  revalidatePath("/calendar");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return { error: null };
}

export type PlanState = { error: string | null; success: string | null };

const planSchema = z.object({
  count: z.coerce
    .number()
    .int()
    .min(1, "投稿数は1以上で指定してください")
    .max(MAX_PLAN_COUNT, `投稿数は${MAX_PLAN_COUNT}件までにしてください`),
  startDateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "開始日を指定してください"),
});

/** AUTO CONTENT PLAN (F-23): 月間投稿計画を生成しカレンダーに配置する */
export async function createPlanAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const userId = await requireUserId();

  const parsed = planSchema.safeParse({
    count: formData.get("count"),
    startDateKey: formData.get("startDateKey"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  try {
    const { result } = await createContentPlan({
      userId,
      count: parsed.data.count,
      startDateKey: parsed.data.startDateKey,
    });
    revalidatePath("/calendar");
    return {
      error: null,
      success: `${result.items.length}件の投稿計画をカレンダーに配置しました。${result.note}`,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, success: null };
    }
    return {
      error:
        error instanceof Error ? error.message : "計画の生成に失敗しました",
      success: null,
    };
  }
}

/** 計画アイデアの削除 */
export async function deleteIdeaAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const generatedPostId = String(formData.get("generatedPostId") ?? "");
  if (!generatedPostId) return;

  await deletePlannedIdea({ userId, generatedPostId });
  revalidatePath("/calendar");
}
