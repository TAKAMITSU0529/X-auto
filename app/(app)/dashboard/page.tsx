import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getBudgetStatus } from "@/lib/usage/guard";
import { getRankedPosts } from "@/lib/research/service";
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

  const [accountCount, postCount, latestJob, budget, recentAccount] =
    await Promise.all([
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
    ]);

  const ranking = recentAccount
    ? await getRankedPosts({
        userId,
        benchmarkAccountId: recentAccount.id,
        sortBy: "outlier",
        limit: 3,
      })
    : null;

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

          <div className="mt-4 space-y-2 text-sm text-ink-500">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              このスライスで未実装
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>予約投稿とコンテンツカレンダー</li>
              <li>自己投稿分析（AI INSIGHT）</li>
            </ul>
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
