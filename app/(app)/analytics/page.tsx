import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getOwnPostsWithMetrics } from "@/lib/analytics/service";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { getLatestWeeklyReport } from "@/lib/analytics/weekly-report";
import { InsightsSection } from "./insights-section";
import { WeeklyReportSection } from "./weekly-report-section";
import {
  Card,
  DataNote,
  EmptyState,
  PageHeader,
  StatTile,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { SnapshotNowButton } from "./snapshot-now-button";

/** 自己投稿分析 (F-10 基本表示)。 */
export default async function AnalyticsPage() {
  const userId = await requireUserId();
  const [posts, insights, latestReport] = await Promise.all([
    getOwnPostsWithMetrics(userId),
    computePerformanceInsights(userId),
    getLatestWeeklyReport(userId),
  ]);

  const totals = posts.reduce(
    (acc, p) => {
      acc.impressions += p.latest?.impressions ?? 0;
      acc.engagements += p.engagements;
      acc.urlClicks += p.latest?.urlClicks ?? 0;
      acc.profileClicks += p.latest?.profileClicks ?? 0;
      return acc;
    },
    { impressions: 0, engagements: 0, urlClicks: 0, profileClicks: 0 },
  );

  return (
    <>
      <PageHeader
        title="自己投稿分析"
        description="X AUTO から投稿した自分の投稿の実績です。ここに蓄積されたデータが Personal Growth Model（Phase 2）の学習元になります。"
        action={<SnapshotNowButton />}
      />

      {posts.length === 0 ? (
        <EmptyState
          title="まだ投稿実績がありません"
          description="予約投稿から X へ投稿すると、投稿後 1時間/6時間/24時間/3日/7日/14日/30日 のタイミングでメトリクスが自動記録されます。"
          action={
            <Link
              href="/schedule"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              予約投稿へ
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="投稿数"
              value={formatNumber(posts.length)}
              sub="X AUTO 経由"
            />
            <StatTile
              label="合計インプレッション"
              value={formatNumber(totals.impressions)}
              sub="最新スナップショット時点"
            />
            <StatTile
              label="平均エンゲージメント率"
              value={
                totals.impressions > 0
                  ? formatPercent(totals.engagements / totals.impressions)
                  : "—"
              }
              sub="総エンゲージメント ÷ 総インプレッション"
            />
            <StatTile
              label="プロフィール / URLクリック"
              value={`${formatNumber(totals.profileClicks)} / ${formatNumber(totals.urlClicks)}`}
              sub="マネタイズ動線への流入"
            />
          </div>

          <DataNote>
            数値はすべて X API から取得した実測値です。URLクリック・プロフィールクリックは
            X API 側の30日制限があるため、定期スナップショットで取得して自前DBに履歴として保存しています。
            「—」は未取得（取得タイミング前・権限不足・30日超過）を示します。
          </DataNote>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                    <th className="pb-2 pr-3 font-medium">投稿</th>
                    <th className="pb-2 pr-3 text-right font-medium">インプ</th>
                    <th className="pb-2 pr-3 text-right font-medium">いいね</th>
                    <th className="pb-2 pr-3 text-right font-medium">リポスト</th>
                    <th className="pb-2 pr-3 text-right font-medium">返信</th>
                    <th className="pb-2 pr-3 text-right font-medium">ブクマ</th>
                    <th className="pb-2 pr-3 text-right font-medium">プロフC</th>
                    <th className="pb-2 pr-3 text-right font-medium">URLC</th>
                    <th className="pb-2 pr-3 text-right font-medium">ER</th>
                    <th className="pb-2 text-right font-medium">記録</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td className="max-w-[280px] py-2.5 pr-3">
                        <p className="line-clamp-2 whitespace-pre-wrap text-ink-800">
                          {post.text}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          @{post.handle} · {formatDateTime(post.postedAt)}
                        </p>
                      </td>
                      <Num value={post.latest?.impressions} />
                      <Num value={post.latest?.likes} />
                      <Num value={post.latest?.reposts} />
                      <Num value={post.latest?.replies} />
                      <Num value={post.latest?.bookmarks} />
                      <Num value={post.latest?.profileClicks} />
                      <Num value={post.latest?.urlClicks} />
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ink-800">
                        {post.latest && post.latest.impressions > 0
                          ? formatPercent(post.engagementRate)
                          : "—"}
                      </td>
                      <td className="py-2.5 text-right text-xs text-ink-400">
                        {post.snapshotCount}/7
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-400">
              「記録」は 1h/6h/24h/3d/7d/14d/30d の7チェックポイントのうち取得済みの数。
              スナップショットは worker（`npm run worker`）が5分ごとに確認します。
            </p>
          </Card>

          <WeeklyReportSection
            latest={
              latestReport
                ? {
                    createdAt: latestReport.createdAt.toISOString(),
                    report: latestReport.report,
                  }
                : null
            }
          />

          <InsightsSection insights={insights} />
        </div>
      )}
    </>
  );
}

function Num({ value }: { value: number | null | undefined }) {
  return (
    <td className="py-2.5 pr-3 text-right tabular-nums text-ink-700">
      {value === null || value === undefined ? "—" : formatNumber(value)}
    </td>
  );
}
