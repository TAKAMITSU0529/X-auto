import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AiService, type DraftResult, type DraftScore } from "@/lib/ai";
import type { StructureBlock } from "@/lib/ai";
import {
  checkSimilarity,
  type SimilarityResult,
} from "@/lib/text/similarity";
import {
  applyPersonalCorrection,
  type PersonallyAdjustedScore,
} from "@/lib/generation/personal-model";

/**
 * 投稿生成 (要件定義 F-05 モデリング再生成 / F-06 3案生成) の中核処理。
 *
 * - 元投稿からは「構造・HOOK方式・心理・情報配置・CTA構造」だけを転用する
 * - 内容は本人の入力と MY BRAND (F-17) を一次情報として使う
 * - 生成後に元投稿との類似度チェックを行い、結果を保存する (§12 コピー防止)
 */

export type GenerationInput = {
  userId: string;
  /** モデリング元の投稿 (任意)。指定しない場合はゼロベース生成 */
  sourcePostId?: string;
  /** 勝ちパターン (F-16) をモデリング元にする場合に指定 */
  winningPatternId?: string;
  genre: string;
  /** 今回の投稿で伝えたい内容 */
  message: string;
  /** 自分の経験・具体例 (任意) */
  experience?: string;
  /** 投稿の目的 (認知/共感/教育/販売 等) */
  purpose?: string;
};

export type DraftWithSimilarity = DraftResult & {
  similarity: SimilarityResult | null;
};

export type GenerationResult = {
  generatedPostId: string;
  drafts: DraftWithSimilarity[];
  sourceText: string | null;
  predictedScores: PersonallyAdjustedScore[] | null;
};

export async function generateThreeDrafts(
  input: GenerationInput,
): Promise<GenerationResult> {
  // モデリング元の投稿 (所有チェック付き)
  const sourcePost = input.sourcePostId
    ? await prisma.post.findFirst({
        where: {
          id: input.sourcePostId,
          benchmarkAccount: { list: { userId: input.userId } },
        },
        include: {
          analyses: { where: { userId: input.userId }, take: 1 },
        },
      })
    : null;

  if (input.sourcePostId && !sourcePost) {
    throw new Error("モデリング元の投稿が見つかりません。");
  }

  // 勝ちパターン (F-16) をモデリング元にする場合
  const winningPattern = input.winningPatternId
    ? await prisma.winningPattern.findFirst({
        where: { id: input.winningPatternId, userId: input.userId },
      })
    : null;
  if (input.winningPatternId && !winningPattern) {
    throw new Error("勝ちパターンが見つかりません。");
  }

  // MY BRAND 設定 (F-17)。生成は常にこれを参照する
  const brand = await prisma.brandProfile.findUnique({
    where: { userId: input.userId },
  });

  // 分析済みなら構造情報も渡す (構造の転用の精度を上げる)。
  // 勝ちパターン指定時はそのステップを構造として渡す。
  const patternJson = winningPattern?.patternJson as {
    steps?: string[];
    description?: string;
    hookHint?: string;
  } | null;

  const structure: StructureBlock[] | undefined = patternJson?.steps
    ? patternJson.steps.map((step) => ({ label: step, text: "" }))
    : ((sourcePost?.analyses[0]?.structureJson as unknown as
        | StructureBlock[]
        | null) ?? undefined);

  const message = [
    input.message,
    input.experience ? `\n自分の経験・具体例: ${input.experience}` : "",
    input.purpose ? `\n投稿の目的: ${input.purpose}` : "",
    winningPattern
      ? `\n使用する勝ちパターン「${winningPattern.name}」: ${patternJson?.description ?? ""} / 書き出しのヒント: ${patternJson?.hookHint ?? ""}`
      : "",
  ].join("");

  const ai = new AiService(input.userId);
  const drafts = await ai.generateDrafts({
    sourceText: sourcePost?.text,
    structure,
    genre: input.genre,
    message,
    brand: brand
      ? {
          basicInfo: brand.basicInfoJson,
          style: brand.styleJson,
          prohibited: brand.prohibitedJson,
        }
      : undefined,
  });

  // 類似度チェック (F-05)。元投稿がある場合のみ
  const draftsWithSimilarity: DraftWithSimilarity[] = drafts.map((draft) => ({
    ...draft,
    similarity: sourcePost ? checkSimilarity(draft.text, sourcePost.text) : null,
  }));

  // AI予測反応スコア (F-06)。失敗しても生成自体は成立させる。
  // スコアには Personal Growth Model (F-19) の本人データ補正を適用する。
  let predictedScores: PersonallyAdjustedScore[] | null = null;
  try {
    const baseScores: DraftScore[] = await ai.scoreDrafts({
      drafts: drafts.map((d) => ({ label: d.label, text: d.text })),
      genre: input.genre,
      brand: brand?.basicInfoJson ?? undefined,
    });
    predictedScores = await applyPersonalCorrection({
      userId: input.userId,
      drafts,
      scores: baseScores,
    });
  } catch {
    predictedScores = null;
  }

  const record = await prisma.generatedPost.create({
    data: {
      userId: input.userId,
      sourceRefs: {
        sourcePostId: sourcePost?.id ?? null,
        winningPatternId: winningPattern?.id ?? null,
        genre: input.genre,
        message: input.message,
        experience: input.experience ?? null,
        purpose: input.purpose ?? null,
      } as Prisma.InputJsonValue,
      draftsJson: draftsWithSimilarity as unknown as Prisma.InputJsonValue,
      predictedScores: predictedScores
        ? (predictedScores as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      similarityJson: sourcePost
        ? (draftsWithSimilarity.map((d) => d.similarity) as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: "ai_generated",
    },
  });

  return {
    generatedPostId: record.id,
    drafts: draftsWithSimilarity,
    sourceText: sourcePost?.text ?? null,
    predictedScores,
  };
}

/** 案を選択して下書き保存する (選択案は編集可能) */
export async function selectDraft(args: {
  userId: string;
  generatedPostId: string;
  selectedIndex: number;
  editedText: string;
}): Promise<void> {
  const record = await prisma.generatedPost.findFirst({
    where: { id: args.generatedPostId, userId: args.userId },
  });
  if (!record) {
    throw new Error("生成結果が見つかりません。");
  }

  // 編集後のテキストも改めて類似度チェックする
  // (編集の過程で元投稿に寄ってしまうケースを拾うため)
  const sourceRefs = record.sourceRefs as { sourcePostId?: string | null } | null;
  let similarity: SimilarityResult | null = null;

  if (sourceRefs?.sourcePostId) {
    const sourcePost = await prisma.post.findUnique({
      where: { id: sourceRefs.sourcePostId },
    });
    if (sourcePost) {
      similarity = checkSimilarity(args.editedText, sourcePost.text);
      if (similarity.level === "warning") {
        throw new Error(similarity.message ?? "元投稿と酷似しています。");
      }
    }
  }

  await prisma.generatedPost.update({
    where: { id: record.id },
    data: {
      selectedIndex: args.selectedIndex,
      selectedText: args.editedText,
      status: "draft",
    },
  });
}
