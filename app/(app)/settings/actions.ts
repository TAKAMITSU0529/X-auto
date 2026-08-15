"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getOrCreateBudgetSetting } from "@/lib/usage/guard";

export type SettingsState = { error: string | null; success: string | null };

const schema = z.object({
  monthlyLimitUsd: z.coerce
    .number()
    .min(0, "0以上の値を入力してください")
    .max(100000),
  warningRatio: z.coerce
    .number()
    .min(0, "0〜1の範囲で入力してください")
    .max(1, "0〜1の範囲で入力してください"),
  maxPostsPerResearch: z.coerce.number().int().min(10).max(1000),
  enforceHardStop: z.boolean(),
});

export async function updateBudgetAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();

  const parsed = schema.safeParse({
    monthlyLimitUsd: formData.get("monthlyLimitUsd"),
    warningRatio: formData.get("warningRatio"),
    maxPostsPerResearch: formData.get("maxPostsPerResearch"),
    enforceHardStop: formData.get("enforceHardStop") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  await getOrCreateBudgetSetting(userId);

  await prisma.budgetSetting.update({
    where: { userId },
    data: {
      monthlyLimitUsd: new Prisma.Decimal(parsed.data.monthlyLimitUsd),
      warningRatio: new Prisma.Decimal(parsed.data.warningRatio),
      maxPostsPerResearch: parsed.data.maxPostsPerResearch,
      enforceHardStop: parsed.data.enforceHardStop,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { error: null, success: "BUDGET LIMIT を更新しました" };
}
