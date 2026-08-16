import { prisma } from "@/lib/db";
import {
  AiService,
  type ChatMessage,
  type ChatReply,
} from "@/lib/ai";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { computePillarBalance } from "@/lib/pillars/service";
import { getBudgetStatus } from "@/lib/usage/guard";

/**
 * AI CHAT (要件定義 F-22)。
 *
 * 蓄積された実測データ (自己実績・柱のズレ・ベンチマーク・戦略設定) を
 * 要約してコンテキストとして渡し、回答は §9 のルール
 * (DATA / HYPOTHESIS / ACTION の区別) に従わせる。
 * コンテキストはDB内データのみで組み立てる = 追加のX APIコストゼロ。
 */

export type ChatContext = {
  ownPostCount: number;
  avgEngagementRate: number | null;
  bestHook: string | null;
  bestFormat: string | null;
  bestSlot: string | null;
  /** 設計比率に対して最も不足している柱 (F-18) */
  lackingPillar: string | null;
  pillars: { name: string; targetRatio: number; actualRatio: number }[];
  /** DB内のベンチマーク高反応投稿 (冒頭のみ) */
  topBenchmarkPosts: { handle: string; likes: number; head: string }[];
  /** マーケティング戦略の要約 (F-09。設定があれば) */
  strategy: unknown | null;
  /** 今月のAPI利用状況 */
  budget: { spentUsd: number; limitUsd: number };
};

/** チャットに渡す実測コンテキストを組み立てる (すべてDB内データ) */
export async function buildChatContext(userId: string): Promise<ChatContext> {
  const [insights, pillarReport, strategy, budget, benchmarkPosts] =
    await Promise.all([
      computePerformanceInsights(userId),
      computePillarBalance(userId),
      prisma.marketingStrategy.findUnique({ where: { userId } }),
      getBudgetStatus(userId),
      prisma.post.findMany({
        where: { benchmarkAccount: { list: { userId } } },
        include: { metrics: { orderBy: { fetchedAt: "desc" }, take: 1 } },
        orderBy: { postedAt: "desc" },
        take: 100,
      }),
    ]);

  const topBenchmarkPosts = benchmarkPosts
    .map((post) => ({
      handle: post.authorHandle,
      likes: post.metrics[0]?.likes ?? 0,
      head: post.text.slice(0, 60),
    }))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);

  const bySlot = insights.bySlot[0] ?? null;

  return {
    ownPostCount: insights.sampleSize,
    avgEngagementRate:
      insights.sampleSize > 0 && bySlot ? bySlot.avgEngagementRate : null,
    bestHook: insights.best.hook,
    bestFormat: insights.best.format,
    bestSlot: insights.best.daySlot,
    lackingPillar: pillarReport?.mostLacking?.name ?? null,
    pillars:
      pillarReport?.balances.map((b) => ({
        name: b.name,
        targetRatio: b.targetRatio,
        actualRatio: b.actualRatio,
      })) ?? [],
    topBenchmarkPosts,
    strategy: strategy
      ? { who: strategy.whoJson, what: strategy.whatJson }
      : null,
    budget: { spentUsd: budget.spentUsd, limitUsd: budget.limitUsd },
  };
}

/** 1ターンのチャットを実行する */
export async function runChat(args: {
  userId: string;
  question: string;
  history: ChatMessage[];
}): Promise<ChatReply> {
  const context = await buildChatContext(args.userId);
  return new AiService(args.userId).chat({
    question: args.question,
    history: args.history.slice(-8),
    context,
  });
}
