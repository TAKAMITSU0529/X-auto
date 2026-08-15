import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AiService, type WeeklyReportResult } from "@/lib/ai";
import { computePerformanceInsights } from "@/lib/analytics/insights";

/**
 * 週次AIレポート (要件定義 F-20)。
 *
 * 直近7日の実測データ (投稿数・インプレッション・ER・前週比・ベスト投稿) を
 * 集計してAIに渡し、総括と NEXT BEST ACTION を生成して保存する。
 * 数値の集計は DATA、レポート本文は HYPOTHESIS/ACTION (§9)。
 */

const DAY = 24 * 60 * 60 * 1000;

type WeekStats = {
  postCount: number;
  impressions: number;
  engagements: number;
  avgEngagementRate: number;
};

async function collectWeekStats(
  userId: string,
  from: Date,
  to: Date,
): Promise<WeekStats & { bestPostText: string | null }> {
  const posts = await prisma.ownPost.findMany({
    where: { xAccount: { userId }, postedAt: { gte: from, lt: to } },
    include: { metrics: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });

  let impressions = 0;
  let engagements = 0;
  let bestPostText: string | null = null;
  let bestEr = -1;

  for (const post of posts) {
    const m = post.metrics[0];
    if (!m) continue;
    const e = m.likes + m.reposts + m.quotes + m.replies + m.bookmarks;
    impressions += m.impressions;
    engagements += e;
    const er = m.impressions > 0 ? e / m.impressions : 0;
    if (er > bestEr) {
      bestEr = er;
      bestPostText = post.text;
    }
  }

  return {
    postCount: posts.length,
    impressions,
    engagements,
    avgEngagementRate: impressions > 0 ? engagements / impressions : 0,
    bestPostText,
  };
}

export type StoredWeeklyReport = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  report: WeeklyReportResult;
  stats: {
    thisWeek: WeekStats;
    lastWeek: WeekStats;
    impressionChangePct: number | null;
  };
};

/** 直近7日の週次レポートを生成して保存する */
export async function generateAndStoreWeeklyReport(
  userId: string,
): Promise<StoredWeeklyReport> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * DAY);
  const prevStart = new Date(now.getTime() - 14 * DAY);

  const [thisWeek, lastWeek, insights] = await Promise.all([
    collectWeekStats(userId, periodStart, now),
    collectWeekStats(userId, prevStart, periodStart),
    computePerformanceInsights(userId),
  ]);

  const impressionChangePct =
    lastWeek.impressions > 0
      ? ((thisWeek.impressions - lastWeek.impressions) / lastWeek.impressions) *
        100
      : null;

  const stats = {
    period: `${periodStart.toISOString().slice(0, 10)} 〜 ${now.toISOString().slice(0, 10)}`,
    postCount: thisWeek.postCount,
    impressions: thisWeek.impressions,
    avgEngagementRatePct: Number((thisWeek.avgEngagementRate * 100).toFixed(2)),
    impressionChangePct:
      impressionChangePct !== null
        ? Number(impressionChangePct.toFixed(1))
        : null,
    bestPostExcerpt: thisWeek.bestPostText?.slice(0, 120) ?? null,
    bestHook: insights.best.hook,
    bestFormat: insights.best.format,
    bestSlot: insights.best.daySlot,
  };

  const report = await new AiService(userId).generateWeeklyReport({ stats });

  const saved = await prisma.weeklyReport.upsert({
    where: {
      userId_periodStart: {
        userId,
        // 同じ日に再生成した場合は上書き (日単位で丸める)
        periodStart: new Date(periodStart.toISOString().slice(0, 10)),
      },
    },
    create: {
      userId,
      periodStart: new Date(periodStart.toISOString().slice(0, 10)),
      periodEnd: now,
      reportJson: { report, stats } as Prisma.InputJsonValue,
    },
    update: {
      periodEnd: now,
      reportJson: { report, stats } as Prisma.InputJsonValue,
    },
  });

  return {
    id: saved.id,
    periodStart: saved.periodStart,
    periodEnd: saved.periodEnd,
    createdAt: saved.createdAt,
    report,
    stats: { thisWeek, lastWeek, impressionChangePct },
  };
}

/** 最新の保存済みレポートを返す */
export async function getLatestWeeklyReport(userId: string) {
  const row = await prisma.weeklyReport.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  const json = row.reportJson as {
    report: WeeklyReportResult;
    stats: Record<string, unknown>;
  };
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    createdAt: row.createdAt,
    report: json.report,
    stats: json.stats,
  };
}
