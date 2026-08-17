import { prisma } from "@/lib/db";
import { AiService, type PostCheckResult } from "@/lib/ai";
import { ngramJaccard, lcsRatio } from "@/lib/text/similarity";
import { getStrategyForGeneration } from "@/lib/strategy/service";

/**
 * 投稿前AIチェック (要件定義 F-07 拡張)。
 *
 * - 9項目のうち 読みやすさ〜リスク表現 の8項目は AI 判定 (AI推定)
 * - 「類似投稿・重複」は過去の自分の投稿・予約とのルールベース比較 (DATA)。
 *   X の自動化ルール (実質同一コンテンツの再投稿禁止) への抵触を予約前に検出する
 * - 結果画面で「このまま投稿」(そのまま予約) と「AIでもっと強くする」
 *   (improvedText への差し替え) を選択できる
 */

export type DuplicateCheck = {
  /** 最も似ていた過去投稿との類似スコア (0〜1) */
  maxScore: number;
  /** 最も似ていた過去投稿の冒頭 (目立った類似が無ければ null) */
  similarTo: string | null;
  /** true = 実質同一とみなされ予約がブロックされる水準 */
  isDuplicate: boolean;
};

export type PreCheckReport = {
  aiCheck: PostCheckResult;
  duplicate: DuplicateCheck;
};

/** 実質同一とみなす類似スコアのしきい値 */
const DUPLICATE_THRESHOLD = 0.7;

/** 過去の自分の投稿・予約と比較して重複を検出する (ルールベース = DATA) */
export async function checkDuplicateAgainstOwnPosts(args: {
  userId: string;
  text: string;
}): Promise<DuplicateCheck> {
  const [ownPosts, scheduled] = await Promise.all([
    prisma.ownPost.findMany({
      where: { xAccount: { userId: args.userId } },
      orderBy: { postedAt: "desc" },
      take: 100,
      select: { text: true },
    }),
    prisma.scheduledPost.findMany({
      where: {
        generatedPost: { userId: args.userId },
        status: { in: ["scheduled", "posting", "published"] },
      },
      orderBy: { scheduledAt: "desc" },
      take: 100,
      select: { text: true },
    }),
  ]);

  let maxScore = 0;
  let similarTo: string | null = null;

  for (const past of [...ownPosts, ...scheduled]) {
    if (past.text === args.text) {
      return { maxScore: 1, similarTo: past.text.slice(0, 60), isDuplicate: true };
    }
    const score = Math.max(
      ngramJaccard(args.text, past.text),
      lcsRatio(args.text, past.text),
    );
    if (score > maxScore) {
      maxScore = score;
      similarTo = past.text.slice(0, 60);
    }
  }

  return {
    maxScore,
    similarTo: maxScore >= 0.4 ? similarTo : null,
    isDuplicate: maxScore >= DUPLICATE_THRESHOLD,
  };
}

/** 下書きに対して投稿前チェック一式を実行する */
export async function runPreCheck(args: {
  userId: string;
  generatedPostId: string;
}): Promise<PreCheckReport> {
  const draft = await prisma.generatedPost.findFirst({
    where: { id: args.generatedPostId, userId: args.userId },
  });
  if (!draft?.selectedText) {
    throw new Error("チェック対象の下書きが見つかりません。");
  }

  const [brand, strategy, duplicate] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { userId: args.userId } }),
    getStrategyForGeneration(args.userId),
    checkDuplicateAgainstOwnPosts({
      userId: args.userId,
      text: draft.selectedText,
    }),
  ]);

  const aiCheck = await new AiService(args.userId).checkPost({
    text: draft.selectedText,
    brand: brand
      ? { style: brand.styleJson, prohibited: brand.prohibitedJson }
      : undefined,
    strategy,
  });

  return { aiCheck, duplicate };
}

/** 「AIでもっと強くする」: 改善版本文で下書きを差し替える */
export async function applyImprovedText(args: {
  userId: string;
  generatedPostId: string;
  improvedText: string;
}): Promise<void> {
  const text = args.improvedText.trim();
  if (text.length === 0 || text.length > 2000) {
    throw new Error("改善版の本文が不正です。");
  }

  const draft = await prisma.generatedPost.findFirst({
    where: { id: args.generatedPostId, userId: args.userId },
  });
  if (!draft) {
    throw new Error("下書きが見つかりません。");
  }

  // 差し替え後もそのまま予約できるよう status は draft を維持する
  await prisma.generatedPost.update({
    where: { id: draft.id },
    data: { selectedText: text, status: "draft" },
  });
}
