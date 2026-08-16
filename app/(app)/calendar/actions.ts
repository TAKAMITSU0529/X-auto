"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { reschedulePostDate } from "@/lib/calendar/service";

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
