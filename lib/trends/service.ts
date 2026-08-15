import { AiService, type TrendAnalysisResult } from "@/lib/ai";
import { XApiService } from "@/lib/x-api";
import { getBudgetStatus } from "@/lib/usage/guard";

/**
 * ジャンル・トレンド分析 (要件定義 F-11 / TREND RADAR)。
 *
 * X の直近7日検索でジャンルの高反応投稿を収集し、AIが
 * Rising / Evergreen / Saturated / Opportunity に分類する。
 *
 * 注意 (§7): 検索は読み取り件数が膨らみやすい機能のため、
 * 1回の取得件数は BUDGET 設定の上限と 50 件の小さい方に固定する。
 */

export const TREND_MAX_RESULTS = 50;

export type TrendRunResult = {
  result: TrendAnalysisResult;
  fetchedCount: number;
  query: string;
};

export async function runTrendAnalysis(args: {
  userId: string;
  genre: string;
}): Promise<TrendRunResult> {
  const budget = await getBudgetStatus(args.userId);
  const maxResults = Math.min(TREND_MAX_RESULTS, budget.maxPostsPerResearch);

  // 日本語ジャンルの検索クエリ。リポスト除外・日本語のみ
  const query = `${args.genre} -is:retweet lang:ja`;

  const posts = await new XApiService(args.userId).searchPosts(
    query,
    maxResults,
  );

  if (posts.length === 0) {
    throw new Error(
      "検索結果が0件でした。ジャンルのキーワードを変えて試してください。",
    );
  }

  // いいね数の多い順に並べ、高反応投稿を優先して分析に渡す
  const sorted = [...posts].sort((a, b) => b.metrics.likes - a.metrics.likes);

  const result = await new AiService(args.userId).analyzeTrends({
    genre: args.genre,
    posts: sorted.map((p) => ({ text: p.text, likes: p.metrics.likes })),
  });

  return { result, fetchedCount: posts.length, query };
}
