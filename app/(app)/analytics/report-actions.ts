"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { generateAndStoreWeeklyReport } from "@/lib/analytics/weekly-report";
import { BudgetExceededError } from "@/lib/usage/guard";
import type { WeeklyReportResult } from "@/lib/ai";

export type WeeklyReportState = {
  error: string | null;
  report: WeeklyReportResult | null;
};

/** 週次レポートの生成・保存 (F-20) */
export async function generateWeeklyReportAction(
  _prev: WeeklyReportState,
  _formData: FormData,
): Promise<WeeklyReportState> {
  const userId = await requireUserId();

  try {
    const stored = await generateAndStoreWeeklyReport(userId);
    revalidatePath("/analytics");
    revalidatePath("/dashboard");
    return { error: null, report: stored.report };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, report: null };
    }
    return {
      error:
        error instanceof Error ? error.message : "レポート生成に失敗しました",
      report: null,
    };
  }
}
