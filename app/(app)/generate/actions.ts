"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { generateThreeDrafts, selectDraft } from "@/lib/generation/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type GenerateState = { error: string | null };

const generateSchema = z.object({
  sourcePostId: z.string().optional(),
  patternId: z.string().optional(),
  genre: z.string().trim().min(1, "ジャンルを入力してください").max(60),
  message: z
    .string()
    .trim()
    .min(1, "伝えたい内容を入力してください")
    .max(2000),
  experience: z.string().trim().max(2000).optional(),
  purpose: z.string().trim().max(60).optional(),
});

export async function generateAction(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const userId = await requireUserId();

  const parsed = generateSchema.safeParse({
    sourcePostId: formData.get("sourcePostId") || undefined,
    patternId: formData.get("patternId") || undefined,
    genre: formData.get("genre"),
    message: formData.get("message"),
    experience: formData.get("experience") || undefined,
    purpose: formData.get("purpose") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください" };
  }

  let generatedPostId: string;
  try {
    const result = await generateThreeDrafts({
      userId,
      sourcePostId: parsed.data.sourcePostId,
      winningPatternId: parsed.data.patternId,
      genre: parsed.data.genre,
      message: parsed.data.message,
      experience: parsed.data.experience,
      purpose: parsed.data.purpose,
    });
    generatedPostId = result.generatedPostId;
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message };
    }
    return {
      error: error instanceof Error ? error.message : "生成に失敗しました",
    };
  }

  revalidatePath("/generate");
  const sourceParam = parsed.data.sourcePostId
    ? `&source=${parsed.data.sourcePostId}`
    : parsed.data.patternId
      ? `&pattern=${parsed.data.patternId}`
      : "";
  redirect(`/generate?g=${generatedPostId}${sourceParam}`);
}

export type SelectState = { error: string | null; success: string | null };

const selectSchema = z.object({
  generatedPostId: z.string().min(1),
  selectedIndex: z.coerce.number().int().min(0).max(2),
  editedText: z
    .string()
    .trim()
    .min(1, "本文が空です")
    .max(2000, "本文が長すぎます"),
});

export async function selectDraftAction(
  _prev: SelectState,
  formData: FormData,
): Promise<SelectState> {
  const userId = await requireUserId();

  const parsed = selectSchema.safeParse({
    generatedPostId: formData.get("generatedPostId"),
    selectedIndex: formData.get("selectedIndex"),
    editedText: formData.get("editedText"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  try {
    await selectDraft({
      userId,
      generatedPostId: parsed.data.generatedPostId,
      selectedIndex: parsed.data.selectedIndex,
      editedText: parsed.data.editedText,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存に失敗しました",
      success: null,
    };
  }

  revalidatePath("/generate");
  return {
    error: null,
    success:
      "下書きとして保存しました。予約投稿（スライス4で実装予定）からXへ投稿できるようになります。",
  };
}
