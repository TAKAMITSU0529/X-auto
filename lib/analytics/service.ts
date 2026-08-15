import { prisma } from "@/lib/db";
import { XApiService, isMockMode } from "@/lib/x-api";
import { getValidAccessToken } from "@/lib/x-oauth";

/**
 * 自己投稿メトリクスのスナップショット取得 (要件定義 F-10 / §12)。
 *
 * X API の非公開指標 (URLクリック・プロフィールクリック) には30日制限が
 * あるため、投稿後 1h/6h/24h/3d/7d/14d/30d のタイミングで取得して
 * 自前のDBに履歴化する。30日を過ぎたデータも DB には残り続ける。
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** スナップショットのスケジュール定義 */
export const SNAPSHOT_SCHEDULE: { label: string; afterMs: number }[] = [
  { label: "1h", afterMs: 1 * HOUR },
  { label: "6h", afterMs: 6 * HOUR },
  { label: "24h", afterMs: 24 * HOUR },
  { label: "3d", afterMs: 3 * DAY },
  { label: "7d", afterMs: 7 * DAY },
  { label: "14d", afterMs: 14 * DAY },
  { label: "30d", afterMs: 30 * DAY },
];

/**
 * 予定時刻を過ぎてから許容する遅延。これを超えて取り逃したチェックポイントは
 * 記録しない (後から取った値を過去時点の値のように見せないため)。
 */
const TOLERANCE_MS = 24 * HOUR;

export type SnapshotResult = {
  checked: number;
  captured: number;
  skippedMissedWindow: number;
  errors: number;
};

/** 期限が来たスナップショットを取得・保存する。worker から定期的に呼ばれる。 */
export async function processMetricSnapshots(
  now = new Date(),
): Promise<SnapshotResult> {
  const result: SnapshotResult = {
    checked: 0,
    captured: 0,
    skippedMissedWindow: 0,
    errors: 0,
  };

  // 31日以上前の投稿はすべてのチェックポイントが確定済みなので対象外
  const posts = await prisma.ownPost.findMany({
    where: { postedAt: { gte: new Date(now.getTime() - 32 * DAY) } },
    include: {
      xAccount: { select: { id: true, userId: true } },
      metrics: { select: { snapshotLabel: true } },
    },
  });

  for (const post of posts) {
    result.checked++;
    const captured = new Set(post.metrics.map((m) => m.snapshotLabel));
    const age = now.getTime() - post.postedAt.getTime();

    // この投稿でいま取得すべきラベルを決める
    const dueLabels = SNAPSHOT_SCHEDULE.filter((s) => {
      if (captured.has(s.label)) return false;
      if (age < s.afterMs) return false; // まだ早い
      if (age > s.afterMs + TOLERANCE_MS) {
        result.skippedMissedWindow++;
        return false; // 窓を逃した
      }
      return true;
    });

    if (dueLabels.length === 0) continue;

    try {
      const accessToken = isMockMode()
        ? "mock-token"
        : await getValidAccessToken(post.xAccount.id);

      const metrics = await new XApiService(
        post.xAccount.userId,
      ).getOwnPostMetrics({ xPostId: post.xPostId, accessToken });

      for (const due of dueLabels) {
        await prisma.ownPostMetric.upsert({
          where: {
            ownPostId_snapshotLabel: {
              ownPostId: post.id,
              snapshotLabel: due.label,
            },
          },
          create: {
            ownPostId: post.id,
            snapshotLabel: due.label,
            impressions: metrics.impressions,
            likes: metrics.likes,
            reposts: metrics.reposts,
            quotes: metrics.quotes,
            replies: metrics.replies,
            bookmarks: metrics.bookmarks,
            urlClicks: metrics.urlClicks,
            profileClicks: metrics.profileClicks,
            fetchedAt: now,
          },
          update: {},
        });
        result.captured++;
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}

/** 投稿ごとの最新スナップショットを付けて自己投稿一覧を返す (F-10 基本表示) */
export async function getOwnPostsWithMetrics(userId: string) {
  const posts = await prisma.ownPost.findMany({
    where: { xAccount: { userId } },
    orderBy: { postedAt: "desc" },
    include: {
      xAccount: { select: { handle: true } },
      metrics: { orderBy: { fetchedAt: "desc" } },
    },
  });

  return posts.map((post) => {
    const latest = post.metrics[0] ?? null;
    const engagements = latest
      ? latest.likes +
        latest.reposts +
        latest.quotes +
        latest.replies +
        latest.bookmarks
      : 0;

    return {
      id: post.id,
      xPostId: post.xPostId,
      text: post.text,
      postedAt: post.postedAt,
      handle: post.xAccount.handle,
      latest,
      engagements,
      engagementRate:
        latest && latest.impressions > 0
          ? engagements / latest.impressions
          : 0,
      snapshotCount: post.metrics.length,
    };
  });
}
