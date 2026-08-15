import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AiService, type BatchAnalysisResult } from "@/lib/ai";
import { getRankedPosts } from "@/lib/research/service";

/**
 * 複数投稿の一括分析 (F-04) と勝ちパターンの自動生成 (F-16)。
 *
 * 外れ値スコア上位の投稿群をAIで横断分析し、抽出された勝ちパターンを
 * WinningPattern としてライブラリに保存する。パターンは F-05/F-06 の
 * 生成入力として指定できる。
 */
export async function runBatchAnalysis(args: {
  userId: string;
  benchmarkAccountId: string;
  topN: number;
}): Promise<{
  result: BatchAnalysisResult;
  savedPatternIds: string[];
  analyzedCount: number;
  accountHandle: string;
}> {
  const ranking = await getRankedPosts({
    userId: args.userId,
    benchmarkAccountId: args.benchmarkAccountId,
    sortBy: "outlier",
    limit: args.topN,
  });

  if (!ranking || ranking.posts.length === 0) {
    throw new Error(
      "分析対象の投稿がありません。先にリサーチを実行してください。",
    );
  }

  // 外れ値上位のみに絞る (平常運転の投稿を混ぜるとパターンがぼやける)
  const targets = ranking.posts.filter((p) => p.outlierScore >= 1.5);
  const posts = (targets.length >= 5 ? targets : ranking.posts).slice(
    0,
    args.topN,
  );

  const result = await new AiService(args.userId).analyzeBatch({
    posts: posts.map((p) => ({ text: p.text, outlierScore: p.outlierScore })),
    accountHandle: ranking.account.handle,
  });

  // 勝ちパターンをライブラリへ保存 (同名は上書きせず重複回避)
  const savedPatternIds: string[] = [];
  const avgOutlier =
    posts.reduce((sum, p) => sum + p.outlierScore, 0) / posts.length;

  for (const pattern of result.winningPatterns) {
    const existing = await prisma.winningPattern.findFirst({
      where: { userId: args.userId, name: pattern.name },
    });
    if (existing) {
      savedPatternIds.push(existing.id);
      continue;
    }

    const saved = await prisma.winningPattern.create({
      data: {
        userId: args.userId,
        name: pattern.name,
        patternJson: {
          description: pattern.description,
          steps: pattern.steps,
          hookHint: pattern.hookHint,
          sourceAccount: ranking.account.handle,
        } as Prisma.InputJsonValue,
        avgPerformance: new Prisma.Decimal(
          Math.round(avgOutlier * 100) / 100,
        ),
        sourcePostIds: posts.map((p) => p.id),
      },
    });
    savedPatternIds.push(saved.id);
  }

  return {
    result,
    savedPatternIds,
    analyzedCount: posts.length,
    accountHandle: ranking.account.handle,
  };
}
