import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getBudgetStatus } from "@/lib/usage/guard";
import { getRankedPosts } from "@/lib/research/service";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { getLatestWeeklyReport } from "@/lib/analytics/weekly-report";
import {
  Card,
  EmptyState,
  HypothesisNote,
  OutlierBadge,
  PageHeader,
  StatTile,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/components/ui";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [
    accountCount,
    postCount,
    latestJob,
    budget,
    recentAccount,
    todayScheduled,
    draftCount,
    failedCount,
  ] = await Promise.all([
    prisma.benchmarkAccount.count({ where: { list: { userId } } }),
    prisma.post.count({ where: { benchmarkAccount: { list: { userId } } } }),
    prisma.researchJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getBudgetStatus(userId),
    prisma.benchmarkAccount.findFirst({
      where: { list: { userId }, lastAnalyzedAt: { not: null } },
      orderBy: { lastAnalyzedAt: "desc" },
    }),
    prisma.scheduledPost.findMany({
      where: {
        generatedPost: { userId },
        status: "scheduled",
        scheduledAt: { lte: endOfToday },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
    }),
    prisma.generatedPost.count({
      where: {
        userId,
        status: { in: ["draft", "approved"] },
        selectedText: { not: null },
      },
    }),
    prisma.scheduledPost.count({
      where: { generatedPost: { userId }, status: "failed" },
    }),
  ]);

  const [ranking, insights, latestReport] = await Promise.all([
    recentAccount
      ? getRankedPosts({
          userId,
          benchmarkAccountId: recentAccount.id,
          sortBy: "outlier",
          limit: 3,
        })
      : Promise.resolve(null),
    computePerformanceInsights(userId),
    getLatestWeeklyReport(userId),
  ]);

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="今日やるべきことと、直近のリサーチ結果のサマリーです。"
      />

      {/* PERFORMANCE: 数字 (要件定義 F-21 / §8.1) */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="ベンチマークアカウント"
          value={formatNumber(accountCount)}
          sub="登録数"
        />
        <StatTile
          label="取得済み投稿"
          value={formatNumber(postCount)}
          sub="分析対象のプール"
        />
        <StatTile
          label="今月のAPI利用"
          value={`$${budget.spentUsd.toFixed(2)}`}
          sub={`上限 $${budget.limitUsd.toFixed(2)}（${formatPercent(budget.usageRatio, 0)}）`}
        />
        <StatTile
          label="最終リサーチ"
          value={latestJob ? formatDateTime(latestJob.createdAt) : "—"}
          sub={latestJob ? latestJob.target : "未実行"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            TODAY — 次にやること
          </h2>

          {accountCount === 0 ? (
            <NextStep
              text="まずベンチマークアカウントを登録しましょう。参考にしたいアカウントの投稿を分析対象にします。"
              href="/benchmarks"
              label="ベンチマークを登録"
            />
          ) : postCount === 0 ? (
            <NextStep
              text="ベンチマークアカウントのリサーチをまだ実行していません。投稿を取得して、伸びた投稿を見つけましょう。"
              href="/research"
              label="リサーチを実行"
            />
          ) : (
            <NextStep
              text="取得済みの投稿から外れ値を確認し、モデリングの候補を選びましょう。"
              href="/research"
              label="リサーチ結果を見る"
            />
          )}

          <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              予約状況
            </p>
            {failedCount > 0 ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                失敗した予約投稿が {failedCount} 件あります。
                <Link href="/schedule" className="ml-1 font-semibold underline">
                  確認する
                </Link>
              </p>
            ) : null}
            {todayScheduled.length > 0 ? (
              <ul className="space-y-1.5">
                {todayScheduled.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-2 text-xs">
                    <span className="shrink-0 font-semibold tabular-nums text-brand-700">
                      {formatDateTime(item.scheduledAt)}
                    </span>
                    <span className="line-clamp-1 text-ink-600">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-500">
                今日の予約投稿はありません。
                {draftCount > 0
                  ? `未予約の下書きが ${draftCount} 件あります。`
                  : ""}
                <Link href="/schedule" className="ml-1 text-brand-600 underline">
                  予約投稿へ
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            直近リサーチの外れ値トップ3
          </h2>

          {!ranking || ranking.posts.length === 0 ? (
            <EmptyState
              title="まだリサーチ結果がありません"
              description="リサーチを実行すると、通常成績と比べて伸びた投稿がここに表示されます。"
            />
          ) : (
            <>
              <p className="mb-3 text-xs text-ink-500">
                @{ranking.account.handle} · 通常ER{" "}
                {formatPercent(ranking.baseline.baselineRate)}
              </p>
              <ul className="space-y-3">
                {ranking.posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/posts/${post.id}`}
                      className="block rounded-lg border border-ink-200 p-3 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <OutlierBadge score={post.outlierScore} />
                        <span className="text-xs text-ink-400">
                          いいね {formatNumber(post.metrics.likes)}
                        </span>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm text-ink-700">
                        {post.text}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <HypothesisNote>
                  投稿を開くと、なぜ伸びたのかを10項目のAI分析カードで確認できます。
                </HypothesisNote>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* AI INSIGHT (F-21) */}
      {insights.insights.length > 0 || latestReport ? (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            AI INSIGHT
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.insights.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  実測データからの傾向（DATA）
                </p>
                <ul className="space-y-1.5 text-sm text-ink-700">
                  {insights.insights.slice(0, 3).map((text, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brand-600">▸</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {latestReport ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">
                  NEXT BEST ACTION（AI推定）
                </p>
                <ol className="list-inside list-decimal space-y-1.5 text-sm text-ink-700">
                  {latestReport.report.nextActions.slice(0, 3).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
                <Link
                  href="/analytics"
                  className="mt-2 inline-block text-xs text-brand-600 hover:underline"
                >
                  週次レポート全文を見る →
                </Link>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}

function NextStep({
  text,
  href,
  label,
}: {
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
      <p className="text-sm text-ink-700">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
      >
        {label}
      </Link>
    </div>
  );
}
