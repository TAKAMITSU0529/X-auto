"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { runResearch, type ResearchParams } from "@/lib/research/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type ResearchState = {
  error: string | null;
  success: string | null;
};

const schema = z.object({
  accountId: z.string().min(1, "リサーチ対象を選んでください"),
  maxResults: z.coerce.number().int().min(10).max(1000),
  sinceDays: z.union([z.coerce.number().int().positive(), z.literal(0)]),
  excludeReplies: z.boolean(),
  excludeReposts: z.boolean(),
});

export async function runResearchAction(
  _prev: ResearchState,
  formData: FormData,
): Promise<ResearchState> {
  const userId = await requireUserId();

  const parsed = schema.safeParse({
    accountId: formData.get("accountId"),
    maxResults: formData.get("maxResults"),
    sinceDays: formData.get("sinceDays"),
    excludeReplies: formData.get("excludeReplies") === "on",
    excludeReposts: formData.get("excludeReposts") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  const params: ResearchParams = {
    maxResults: parsed.data.maxResults,
    excludeReplies: parsed.data.excludeReplies,
    excludeReposts: parsed.data.excludeReposts,
    sinceDays: parsed.data.sinceDays === 0 ? null : parsed.data.sinceDays,
  };

  try {
    const result = await runResearch({
      userId,
      benchmarkAccountId: parsed.data.accountId,
      params,
    });

    revalidatePath("/research");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    if (result.fetched === 0) {
      return { error: "投稿を取得できませんでした。", success: null };
    }
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, success: null };
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "リサーチの実行に失敗しました",
      success: null,
    };
  }

  redirect(`/research?account=${parsed.data.accountId}&sort=outlier`);
}
