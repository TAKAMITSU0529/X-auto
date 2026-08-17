import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getBudgetStatus } from "@/lib/usage/guard";
import { getRankedPosts } from "@/lib/research/service";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { getLatestWeeklyReport } from "@/lib/analytics/weekly-report";
import {
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  LinkButton,
  NextActionButton,
  OutlierBadge,
  PageHeader,
  StatTile,
  Tag,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { IconAlert, IconSchedule } from "@/components/icons";

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
        eyebrow="ホーム"
        title="ダッシュボード"
        description="今日やるべきことと、直近のリサーチ結果のサマリーです。"
        action={
          <LinkButton href="/chat" variant="secondary" size="md">
            AI に相談する
          </LinkButton>
        }
      />

      {/* PERFORMANCE: 数字 (要件定義 F-21 / §8.1) */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="ベンチマーク"
          value={formatNumber(accountCount)}
          sub="登録アカウント数"
        />
        <StatTile
          label="取得済み投稿"
          value={formatNumber(postCount)}
          sub="分析対象のプール"
          accent
        />
        <StatTile
          label="今月のAPI利用"
          value={`$${budget.spentUsd.toFixed(2)}`}
          sub={`上限 $${budget.limitUsd.toFixed(2)}（${formatPercent(budget.usageRatio, 0)}）`}
        />
        <StatTile
          label="最終リサーチ"
          value={
            latestJob
              ? new Intl.DateTimeFormat("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(latestJob.createdAt)
              : "—"
          }
          sub={latestJob ? latestJob.target : "未実行"}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="TODAY — 次にやること"
              description="いま着手すべき1手だけを表示します。"
            />

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
          </Card>

          <Card>
            <CardHeader title="予約状況" />

            {failedCount > 0 ? (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800">
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  失敗した予約投稿が{" "}
                  <span className="font-semibold tabular-nums">
                    {failedCount}
                  </span>{" "}
                  件あります。
                  <Link
                    href="/schedule"
                    className="ml-1 font-semibold underline underline-offset-2"
                  >
                    確認する
                  </Link>
                </p>
              </div>
            ) : null}

            {todayScheduled.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {todayScheduled.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-2.5">
                    <span className="mt-px flex shrink-0 items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold tabular-nums text-brand-700">
                      <IconSchedule className="h-3 w-3" />
                      {new Intl.DateTimeFormat("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(item.scheduledAt)}
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-600">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink-50 px-3.5 py-3">
                <p className="text-[13px] text-ink-600">
                  今日の予約投稿はありません。
                  {draftCount > 0 ? (
                    <>
                      未予約の下書きが{" "}
                      <span className="font-semibold tabular-nums text-ink-800">
                        {draftCount}
                      </span>{" "}
                      件あります。
                    </>
                  ) : null}
                </p>
                <NextActionButton href="/schedule">予約投稿へ</NextActionButton>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader
            title="直近リサーチの外れ値トップ3"
            description={
              ranking
                ? `@${ranking.account.handle} · 通常ER ${formatPercent(ranking.baseline.baselineRate)}`
                : undefined
            }
            action={
              ranking && ranking.posts.length > 0 ? (
                <Link
                  href="/research"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  すべて見る
                </Link>
              ) : undefined
            }
          />

          {!ranking || ranking.posts.length === 0 ? (
            <EmptyState
              title="まだリサーチ結果がありません"
              description="リサーチを実行すると、そのアカウントの通常成績と比べて伸びた投稿がここに並びます。"
              action={
                <LinkButton href="/research" size="sm">
                  リサーチを実行する
                </LinkButton>
              }
            />
          ) : (
            <>
              <ul className="space-y-2.5">
                {ranking.posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/posts/${post.id}`}
                      className="block rounded-xl border border-ink-200/70 p-3.5 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <OutlierBadge score={post.outlierScore} />
                        <span className="text-[11px] tabular-nums text-ink-400">
                          いいね {formatNumber(post.metrics.likes)}
                        </span>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
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
          <CardHeader
            title="AI INSIGHT"
            description="実測データからの傾向と、次に取るべき行動です。"
          />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {insights.insights.length > 0 ? (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <Tag tone="data">DATA</Tag>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    実測データからの傾向
                  </span>
                </div>
                <ul className="space-y-2">
                  {insights.insights.slice(0, 3).map((text, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 rounded-lg bg-ink-50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {latestReport ? (
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <Tag tone="action">ACTION</Tag>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    NEXT BEST ACTION（AI推定）
                  </span>
                </div>
                <ol className="space-y-2">
                  {latestReport.report.nextActions.slice(0, 3).map((a, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 rounded-lg bg-emerald-50/70 px-3 py-2.5 text-[13px] leading-relaxed text-emerald-900"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/analytics"
                  className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline"
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
    <div className="rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-white p-4">
      <p className="text-[13px] leading-relaxed text-ink-700">{text}</p>
      <div className="mt-3.5">
        <NextActionButton href={href}>{label}</NextActionButton>
      </div>
    </div>
  );
}
