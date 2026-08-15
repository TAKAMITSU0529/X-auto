"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { AiService } from "@/lib/ai";
import { BudgetExceededError } from "@/lib/usage/guard";

export type PostActionState = { error: string | null; success: string | null };

/**
 * 投稿のAI分析を実行して保存する (F-04)。
 * 結果は PostAnalysis に upsert し、再分析すると上書きされる。
 */
export async function analyzePostAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const userId = await requireUserId();
  const postId = String(formData.get("postId") ?? "");

  const post = await prisma.post.findFirst({
    where: { id: postId, benchmarkAccount: { list: { userId } } },
  });
  if (!post) {
    return { error: "投稿が見つかりません", success: null };
  }

  try {
    const result = await new AiService(userId).analyzePost({
      text: post.text,
      authorHandle: post.authorHandle,
    });

    await prisma.postAnalysis.upsert({
      where: { userId_postId: { userId, postId: post.id } },
      create: {
        userId,
        postId: post.id,
        theme: result.theme,
        targetAudience: result.targetAudience,
        insightJson: result.insight as Prisma.InputJsonValue,
        structureJson: result.structure as unknown as Prisma.InputJsonValue,
        templateType: result.templateType,
        hook: result.hook,
        keywords: result.keywords,
        emotions: result.emotions,
        specificityJson: result.specificity as unknown as Prisma.InputJsonValue,
        cta: result.cta,
        whyItWorks: result.whyItWorks,
        isHypothesis: true,
        model: process.env.AI_MODE === "real" ? process.env.ANTHROPIC_MODEL : "mock",
      },
      update: {
        theme: result.theme,
        targetAudience: result.targetAudience,
        insightJson: result.insight as Prisma.InputJsonValue,
        structureJson: result.structure as unknown as Prisma.InputJsonValue,
        templateType: result.templateType,
        hook: result.hook,
        keywords: result.keywords,
        emotions: result.emotions,
        specificityJson: result.specificity as unknown as Prisma.InputJsonValue,
        cta: result.cta,
        whyItWorks: result.whyItWorks,
        createdAt: new Date(),
      },
    });

    revalidatePath(`/posts/${post.id}`);
    return { error: null, success: "分析が完了しました" };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, success: null };
    }
    return {
      error: error instanceof Error ? error.message : "分析に失敗しました",
      success: null,
    };
  }
}

const saveModelSchema = z.object({
  postId: z.string().min(1),
  categoryTags: z.array(z.string()).min(1, "分類タグを1つ以上選んでください"),
  memo: z.string().trim().max(500).optional(),
});

/** MODEL LIBRARY への保存 (F-16) */
export async function saveToLibraryAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const userId = await requireUserId();

  const parsed = saveModelSchema.safeParse({
    postId: formData.get("postId"),
    categoryTags: formData.getAll("categoryTags").map(String),
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  const post = await prisma.post.findFirst({
    where: {
      id: parsed.data.postId,
      benchmarkAccount: { list: { userId } },
    },
  });
  if (!post) {
    return { error: "投稿が見つかりません", success: null };
  }

  await prisma.modelPost.upsert({
    where: { userId_postId: { userId, postId: post.id } },
    create: {
      userId,
      postId: post.id,
      categoryTags: parsed.data.categoryTags,
      memo: parsed.data.memo || null,
    },
    update: {
      categoryTags: parsed.data.categoryTags,
      memo: parsed.data.memo || null,
    },
  });

  revalidatePath(`/posts/${post.id}`);
  revalidatePath("/library");
  return { error: null, success: "MODEL LIBRARY に保存しました" };
}

/** MODEL LIBRARY から削除 */
export async function removeFromLibraryAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const postId = String(formData.get("postId") ?? "");

  await prisma.modelPost.deleteMany({ where: { userId, postId } });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/library");
}
