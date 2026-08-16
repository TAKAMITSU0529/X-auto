import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getOwnPostsWithMetrics } from "@/lib/analytics/service";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { computeThemeAnalysis } from "@/lib/analytics/themes";
import { getLatestWeeklyReport } from "@/lib/analytics/weekly-report";
import { InsightsSection } from "./insights-section";
import { WeeklyReportSection } from "./weekly-report-section";
import {
  Card,
  CardHeader,
  DataNote,
  EmptyState,
  LinkButton,
  MeterBar,
  NextActionButton,
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
  const [posts, insights, themes, latestReport] = await Promise.all([
    getOwnPostsWithMetrics(userId),
    computePerformanceInsights(userId),
    computeThemeAnalysis(userId),
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
        eyebrow="伸ばす"
        title="自己投稿分析"
        description="X AUTO から投稿した自分の投稿の実績です。ここに蓄積されたデータが Personal Growth Model（Phase 2）の学習元になります。"
        action={<SnapshotNowButton />}
      />

      {posts.length === 0 ? (
        <EmptyState
          title="まだ投稿実績がありません"
          description="予約投稿から X へ投稿すると、投稿後 1時間/6時間/24時間/3日/7日/14日/30日 のタイミングでメトリクスが自動記録されます。"
          action={<LinkButton href="/schedule">予約投稿へ</LinkButton>}
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
              accent
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
            <CardHeader
              title="投稿別の実測値"
              description="最新スナップショット時点の指標です。ER = エンゲージメント率。"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-[11px] font-medium text-ink-500">
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
                    <tr
                      key={post.id}
                      className="transition duration-200 hover:bg-ink-25"
                    >
                      <td className="max-w-[280px] py-2.5 pr-3">
                        <p className="line-clamp-2 whitespace-pre-wrap leading-relaxed text-ink-800">
                          {post.text}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-ink-400">
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
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-ink-900">
                        {post.latest && post.latest.impressions > 0
                          ? formatPercent(post.engagementRate)
                          : "—"}
                      </td>
                      <td className="py-2.5 text-right text-xs tabular-nums text-ink-400">
                        {post.snapshotCount}/7
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-400">
              「記録」は 1h/6h/24h/3d/7d/14d/30d の7チェックポイントのうち取得済みの数。
              スナップショットは worker（`npm run worker`）が5分ごとに確認します。
            </p>
          </Card>

          <Card>
            <CardHeader
              title="CONTENT ANALYSIS — テーマ別の平均エンゲージメント率"
              description="CONTENT PILLARS の柱ごとに、実測ERを比較します。"
              action={
                themes.hasPillars && themes.stats.length > 0 ? (
                  <NextActionButton
                    href={`/generate?genre=${encodeURIComponent(themes.stats[0].theme)}`}
                  >
                    「{themes.stats[0].theme}」で3案生成
                  </NextActionButton>
                ) : undefined
              }
            />
            {!themes.hasPillars ? (
              <p className="text-[13px] leading-relaxed text-ink-500">
                テーマ別分析には CONTENT PILLARS の設定が必要です。{" "}
                <Link
                  href="/pillars"
                  className="font-semibold text-brand-700 underline underline-offset-2 transition duration-200 hover:text-brand-800"
                >
                  ピラーを設定する →
                </Link>
              </p>
            ) : themes.stats.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-500">
                メトリクス取得済みの投稿がまだありません。
              </p>
            ) : (
              <div className="space-y-3">
                <ul className="space-y-2.5">
                  {themes.stats.map((stat, index) => {
                    const maxEr = themes.stats[0].avgEngagementRate || 1;
                    return (
                      <li
                        key={stat.theme}
                        className="flex items-center gap-3 text-[13px]"
                      >
                        <span
                          className={`w-40 shrink-0 truncate ${
                            index === 0
                              ? "font-semibold text-ink-900"
                              : "text-ink-700"
                          }`}
                          title={stat.theme}
                        >
                          {stat.theme}
                        </span>
                        <MeterBar
                          ratio={stat.avgEngagementRate / maxEr}
                          tone={index === 0 ? "brand" : "ink"}
                          className="flex-1"
                        />
                        <span
                          className={`w-16 shrink-0 text-right text-xs tabular-nums ${
                            index === 0
                              ? "font-bold text-brand-700"
                              : "text-ink-700"
                          }`}
                        >
                          {formatPercent(stat.avgEngagementRate)}
                        </span>
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-400">
                          {stat.count}件
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <DataNote>
                  テーマは CONTENT PILLARS（F-18）の柱とキーワードによるルールベース分類です（実測の集計 = DATA）。件数が少ないテーマの数値は参考程度に見てください。
                </DataNote>
              </div>
            )}
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
