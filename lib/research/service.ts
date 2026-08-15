import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BudgetExceededError, getBudgetStatus } from "@/lib/usage/guard";
import { XApiService, type XPost } from "@/lib/x-api";
import {
  calculateBaseline,
  calculateOutlierScore,
  outlierTier,
  type BaselineResult,
  type OutlierTier,
} from "@/lib/metrics/outlier";
import { calculateImpactScore } from "@/lib/metrics/impact";

/**
 * ベンチマーク投稿リサーチ (要件定義 F-02) と外れ値検出 (F-14) の中核処理。
 */

export type ResearchParams = {
  maxResults: number;
  excludeReplies: boolean;
  excludeReposts: boolean;
  /** 期間フィルタ (日数)。null は全期間。 */
  sinceDays: number | null;
};

export const DEFAULT_RESEARCH_PARAMS: ResearchParams = {
  maxResults: 100,
  excludeReplies: true,
  excludeReposts: true,
  sinceDays: null,
};

/** リサーチ実行 */
export async function runResearch(args: {
  userId: string;
  benchmarkAccountId: string;
  params: ResearchParams;
}): Promise<{ jobId: string; fetched: number; fromCache: boolean }> {
  const account = await prisma.benchmarkAccount.findFirst({
    where: {
      id: args.benchmarkAccountId,
      list: { userId: args.userId },
    },
  });

  if (!account) {
    throw new Error("指定されたベンチマークアカウントが見つかりません。");
  }

  const budget = await getBudgetStatus(args.userId);

  // 上限に達している場合はジョブを作らずに止める。
  // (ジョブを作ってから失敗させると、予算ブロックのたびに失敗履歴が溜まるため)
  if (budget.isExceeded && budget.enforceHardStop) {
    throw new BudgetExceededError(budget.spentUsd, budget.limitUsd);
  }

  // BUDGET 設定の取得件数上限を超えないように丸める (F-25)
  const maxResults = Math.min(args.params.maxResults, budget.maxPostsPerResearch);
  const params: ResearchParams = { ...args.params, maxResults };

  const job = await prisma.researchJob.create({
    data: {
      userId: args.userId,
      benchmarkAccountId: account.id,
      target: `@${account.handle}`,
      params: params as unknown as Prisma.InputJsonValue,
      status: JobStatus.running,
      startedAt: new Date(),
    },
  });

  try {
    const service = new XApiService(args.userId);
    const since =
      params.sinceDays !== null
        ? new Date(Date.now() - params.sinceDays * 24 * 60 * 60 * 1000)
        : undefined;

    const { posts, fromCache } = await service.getUserTimeline(
      account.xUserId,
      {
        maxResults: params.maxResults,
        excludeReplies: params.excludeReplies,
        excludeReposts: params.excludeReposts,
        since,
      },
    );

    await persistPosts({
      jobId: job.id,
      benchmarkAccountId: account.id,
      posts,
    });

    await prisma.researchJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.completed,
        fetchedCount: posts.length,
        cacheHits: fromCache ? posts.length : 0,
        finishedAt: new Date(),
      },
    });

    await prisma.benchmarkAccount.update({
      where: { id: account.id },
      data: { lastAnalyzedAt: new Date() },
    });

    return { jobId: job.id, fetched: posts.length, fromCache };
  } catch (error) {
    await prisma.researchJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.failed,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

/**
 * 取得した投稿を保存する。
 * 投稿本体は upsert、メトリクスは常に新しいスナップショットとして追加する
 * (同じ投稿の指標推移を後から追えるようにするため)。
 */
async function persistPosts(args: {
  jobId: string;
  benchmarkAccountId: string;
  posts: XPost[];
}): Promise<void> {
  const fetchedAt = new Date();

  for (const post of args.posts) {
    const saved = await prisma.post.upsert({
      where: { xPostId: post.xPostId },
      create: {
        xPostId: post.xPostId,
        jobId: args.jobId,
        benchmarkAccountId: args.benchmarkAccountId,
        authorXUserId: post.authorXUserId,
        authorHandle: post.authorHandle,
        text: post.text,
        lang: post.lang,
        hasMedia: post.hasMedia,
        mediaUrls: post.mediaUrls,
        isReply: post.isReply,
        isRepost: post.isRepost,
        isQuote: post.isQuote,
        permalink: post.permalink,
        postedAt: post.postedAt,
        fetchedAt,
      },
      update: {
        jobId: args.jobId,
        benchmarkAccountId: args.benchmarkAccountId,
        text: post.text,
        fetchedAt,
      },
    });

    await prisma.postMetric.upsert({
      where: {
        postId_fetchedAt: { postId: saved.id, fetchedAt },
      },
      create: {
        postId: saved.id,
        fetchedAt,
        ...post.metrics,
      },
      update: post.metrics,
    });
  }
}

export type RankedPost = {
  id: string;
  xPostId: string;
  text: string;
  authorHandle: string;
  permalink: string | null;
  postedAt: Date;
  hasMedia: boolean;
  isReply: boolean;
  isRepost: boolean;
  metrics: {
    impressions: number;
    likes: number;
    reposts: number;
    quotes: number;
    replies: number;
    bookmarks: number;
  };
  totalEngagements: number;
  engagementRate: number;
  engagementBasis: "impressions" | "followers" | "none";
  outlierScore: number;
  tier: OutlierTier;
  /** X AUTO IMPACT SCORE (F-15)。0〜100 */
  impactScore: number;
};

export type RankingSortKey =
  | "outlier"
  | "impact"
  | "impressions"
  | "likes"
  | "reposts"
  | "quotes"
  | "replies"
  | "bookmarks"
  | "engagements"
  | "engagementRate"
  | "postedAt";

export const SORT_LABELS: Record<RankingSortKey, string> = {
  outlier: "外れ値スコア",
  impact: "X AUTO SCORE",
  impressions: "インプレッション",
  likes: "いいね",
  reposts: "リポスト",
  quotes: "引用",
  replies: "返信",
  bookmarks: "ブックマーク",
  engagements: "総エンゲージメント",
  engagementRate: "エンゲージメント率",
  postedAt: "投稿日時",
};

/**
 * ベンチマークアカウントの取得済み投稿を、外れ値スコア付きで返す。
 *
 * ベースラインは「取得済みの全投稿」から算出する。表示上のフィルタで
 * 対象を絞っても、比較対象となる通常成績は変わらないようにするため。
 */
export async function getRankedPosts(args: {
  userId: string;
  benchmarkAccountId: string;
  sortBy: RankingSortKey;
  limit?: number;
}): Promise<{
  posts: RankedPost[];
  baseline: BaselineResult;
  account: { handle: string; displayName: string | null; followers: number };
} | null> {
  const account = await prisma.benchmarkAccount.findFirst({
    where: { id: args.benchmarkAccountId, list: { userId: args.userId } },
  });
  if (!account) return null;

  const rows = await prisma.post.findMany({
    where: { benchmarkAccountId: account.id },
    orderBy: { postedAt: "desc" },
    include: { metrics: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });

  const withMetrics = rows.map((row) => {
    const m = row.metrics[0];
    return {
      row,
      metrics: {
        impressions: m?.impressions ?? 0,
        likes: m?.likes ?? 0,
        reposts: m?.reposts ?? 0,
        quotes: m?.quotes ?? 0,
        replies: m?.replies ?? 0,
        bookmarks: m?.bookmarks ?? 0,
      },
    };
  });

  const baseline = calculateBaseline(
    withMetrics.map((w) => ({ metrics: w.metrics, isRepost: w.row.isRepost })),
    account.followers,
  );

  const posts: RankedPost[] = withMetrics.map(({ row, metrics }) => {
    const outlier = calculateOutlierScore(metrics, baseline, account.followers);
    const impact = calculateImpactScore({
      metrics,
      outlier,
      postedAt: row.postedAt,
    });
    return {
      id: row.id,
      xPostId: row.xPostId,
      text: row.text,
      authorHandle: row.authorHandle,
      permalink: row.permalink,
      postedAt: row.postedAt,
      hasMedia: row.hasMedia,
      isReply: row.isReply,
      isRepost: row.isRepost,
      metrics,
      totalEngagements: outlier.totalEngagements,
      engagementRate: outlier.rate,
      engagementBasis: outlier.basis,
      outlierScore: outlier.score,
      tier: outlierTier(outlier.score),
      impactScore: impact.score,
    };
  });

  posts.sort(comparator(args.sortBy));

  return {
    posts: args.limit ? posts.slice(0, args.limit) : posts,
    baseline,
    account: {
      handle: account.handle,
      displayName: account.displayName,
      followers: account.followers,
    },
  };
}

function comparator(key: RankingSortKey): (a: RankedPost, b: RankedPost) => number {
  switch (key) {
    case "outlier":
      return (a, b) => b.outlierScore - a.outlierScore;
    case "impact":
      return (a, b) => b.impactScore - a.impactScore;
    case "engagements":
      return (a, b) => b.totalEngagements - a.totalEngagements;
    case "engagementRate":
      return (a, b) => b.engagementRate - a.engagementRate;
    case "postedAt":
      return (a, b) => b.postedAt.getTime() - a.postedAt.getTime();
    default:
      return (a, b) => b.metrics[key] - a.metrics[key];
  }
}

export { BudgetExceededError };
