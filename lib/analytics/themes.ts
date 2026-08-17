import { prisma } from "@/lib/db";
import { classifyPost, type Pillar } from "@/lib/pillars/service";

/**
 * CONTENT ANALYSIS: テーマ別の平均エンゲージメント率比較 (要件定義 F-10 拡張)。
 *
 * テーマの分類には CONTENT PILLARS (F-18) で設計した柱とキーワードを使う。
 * キーワード一致のルールベース分類なので、集計値は実測の集計 = DATA として
 * 扱える (AI推定ではない・追加AIコスト0)。柱が未設定の場合は設定を促す。
 */

export type ThemeStat = {
  theme: string;
  count: number;
  avgEngagementRate: number;
  totalImpressions: number;
};

export type ThemeAnalysis = {
  /** CONTENT PILLARS が設定済みか (未設定なら設定ページへ誘導する) */
  hasPillars: boolean;
  sampleSize: number;
  stats: ThemeStat[];
};

export async function computeThemeAnalysis(
  userId: string,
): Promise<ThemeAnalysis> {
  const setting = await prisma.contentPillarSetting.findUnique({
    where: { userId },
  });
  if (!setting) {
    return { hasPillars: false, sampleSize: 0, stats: [] };
  }

  const pillars = setting.pillarsJson as unknown as Pillar[];

  const posts = await prisma.ownPost.findMany({
    where: { xAccount: { userId } },
    include: { metrics: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });

  type Bucket = { count: number; erSum: number; impressions: number };
  const buckets = new Map<string, Bucket>();
  let sampleSize = 0;

  for (const post of posts) {
    const m = post.metrics[0];
    if (!m || m.impressions <= 0) continue;
    sampleSize++;

    const engagements =
      m.likes + m.reposts + m.quotes + m.replies + m.bookmarks;
    const theme = classifyPost(post.text, pillars) ?? "未分類";

    const bucket = buckets.get(theme) ?? { count: 0, erSum: 0, impressions: 0 };
    bucket.count++;
    bucket.erSum += engagements / m.impressions;
    bucket.impressions += m.impressions;
    buckets.set(theme, bucket);
  }

  const stats: ThemeStat[] = [...buckets.entries()]
    .map(([theme, b]) => ({
      theme,
      count: b.count,
      avgEngagementRate: b.count > 0 ? b.erSum / b.count : 0,
      totalImpressions: b.impressions,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  return { hasPillars: true, sampleSize, stats };
}
