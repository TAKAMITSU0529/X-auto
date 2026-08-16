import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  getRankedPosts,
  SORT_LABELS,
  type RankingSortKey,
} from "@/lib/research/service";
import { MIN_BASELINE_SAMPLE } from "@/lib/metrics/outlier";
import {
  Card,
  CardHeader,
  DataNote,
  EmptyState,
  LinkButton,
  NextActionButton,
  OutlierBadge,
  PageHeader,
  StatTile,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { ResearchForm } from "./research-form";
import { BatchAnalyzeForm } from "./batch-form";

const SORT_KEYS = Object.keys(SORT_LABELS) as RankingSortKey[];

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; sort?: string }>;
}) {
  const userId = await requireUserId();
  const { account: accountId, sort } = await searchParams;

  const accounts = await prisma.benchmarkAccount.findMany({
    where: { list: { userId } },
    orderBy: { registeredAt: "desc" },
    include: { list: { select: { name: true } } },
  });

  const sortBy: RankingSortKey = SORT_KEYS.includes(sort as RankingSortKey)
    ? (sort as RankingSortKey)
    : "outlier";

  const ranking = accountId
    ? await getRankedPosts({ userId, benchmarkAccountId: accountId, sortBy })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="調べる"
        title="リサーチ"
        description="ベンチマークアカウントの投稿を取得し、そのアカウントの通常成績と比べて伸びた投稿を見つけます。"
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="ベンチマークアカウントが未登録です"
          description="リサーチを実行するには、先にベンチマークアカウントを登録してください。登録が終わるとこの画面で投稿を取得できます。"
          action={
            <LinkButton href="/benchmarks">ベンチマークを登録する</LinkButton>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="リサーチを実行"
              description="対象アカウントと取得件数を指定して、投稿を取り込みます。"
            />
            <ResearchForm
              accounts={accounts.map((a) => ({
                id: a.id,
                handle: a.handle,
                displayName: a.displayName,
                listName: a.list.name,
              }))}
              selectedAccountId={accountId}
            />
          </Card>

          {ranking ? (
            <>
              {/* 1段目: 数字 (要件定義 §8.1) */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label="取得済み投稿"
                  value={formatNumber(ranking.posts.length)}
                  sub={`@${ranking.account.handle}`}
                />
                <StatTile
                  label="通常エンゲージメント率"
                  value={formatPercent(ranking.baseline.baselineRate)}
                  sub={`中央値 / サンプル ${ranking.baseline.sampleSize}件`}
                />
                <StatTile
                  label="外れ値（通常の3倍以上）"
                  value={formatNumber(
                    ranking.posts.filter((p) => p.outlierScore >= 3).length,
                  )}
                  sub="モデリング候補"
                  accent
                />
                <StatTile
                  label="フォロワー"
                  value={formatNumber(ranking.account.followers)}
                  sub={ranking.account.displayName ?? ""}
                />
              </div>

              {!ranking.baseline.reliable ? (
                <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
                  ベースラインの算出サンプルが{" "}
                  <span className="font-semibold tabular-nums">
                    {ranking.baseline.sampleSize}
                  </span>{" "}
                  件と少ないため、外れ値スコアの信頼性は限定的です（
                  <span className="tabular-nums">{MIN_BASELINE_SAMPLE}</span>{" "}
                  件以上を推奨）。 取得件数を増やして再実行してください。
                </div>
              ) : null}

              <DataNote>
                外れ値スコアは「その投稿のエンゲージメント率 ÷
                このアカウントの通常エンゲージメント率（中央値）」で算出した実測値です。
                SCORE は外れ値・量・質・新しさを合成した X AUTO IMPACT SCORE
                です。伸びた理由の解釈は各投稿の「この投稿を分析」から確認できます。
              </DataNote>

              <Card>
                <CardHeader
                  title="外れ値の一括分析"
                  description="外れ値上位20件をAIで横断分析し、勝ちパターンをライブラリに保存します"
                />
                <BatchAnalyzeForm accountId={accountId!} />
              </Card>

              <Card>
                <CardHeader
                  title="ランキング"
                  description="最大50件を表示します。並び替えを変えると評価軸が切り替わります。"
                  action={
                    <a
                      href={`/api/export/research?account=${accountId}&sort=${sortBy}`}
                      download
                      className="inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50"
                    >
                      CSVダウンロード
                    </a>
                  }
                />

                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    並び替え
                  </span>
                  {SORT_KEYS.map((key) => (
                    <Link
                      key={key}
                      href={`/research?account=${accountId}&sort=${key}`}
                      aria-current={sortBy === key ? "true" : undefined}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition duration-200 ${
                        sortBy === key
                          ? "bg-brand-600 text-white shadow-xs"
                          : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </Link>
                  ))}
                </div>

                {ranking.posts.length === 0 ? (
                  <EmptyState
                    title="まだ投稿が取得されていません"
                    description="上の「リサーチを実行」から取得件数を指定して実行すると、ここに外れ値スコア順で並びます。"
                  />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {ranking.posts.slice(0, 50).map((post, index) => (
                      <li key={post.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3.5">
                          <span className="mt-0.5 w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink-400">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                              <OutlierBadge score={post.outlierScore} />
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-700"
                                title="X AUTO IMPACT SCORE (実測値からの合成指標)"
                              >
                                SCORE {post.impactScore}
                              </span>
                              <span className="text-xs tabular-nums text-ink-500">
                                ER {formatPercent(post.engagementRate)}
                                {post.engagementBasis === "followers"
                                  ? "（フォロワー数基準）"
                                  : ""}
                              </span>
                              <span className="text-xs tabular-nums text-ink-400">
                                {formatDateTime(post.postedAt)}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                              {post.text.length > 220
                                ? `${post.text.slice(0, 220)}…`
                                : post.text}
                            </p>

                            <MetricList
                              metrics={{
                                impressions: post.metrics.impressions,
                                likes: post.metrics.likes,
                                reposts: post.metrics.reposts,
                                quotes: post.metrics.quotes,
                                replies: post.metrics.replies,
                                bookmarks: post.metrics.bookmarks,
                              }}
                            />

                            {/* 3段目: 次にやること (要件定義 §8.1 / §59) */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <NextActionButton href={`/posts/${post.id}`}>
                                この投稿を分析
                              </NextActionButton>
                              <NextActionButton
                                href={`/generate?source=${post.id}`}
                              >
                                この型で作る
                              </NextActionButton>
                              {post.permalink ? (
                                <a
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-brand-600 transition duration-200 hover:text-brand-700 hover:underline"
                                >
                                  元投稿を開く
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : (
            <EmptyState
              title="リサーチ対象を選んでください"
              description="上のフォームでアカウントと取得件数を指定して実行すると、取得結果が外れ値スコア順に表示されます。"
            />
          )}
        </div>
      )}
    </>
  );
}

const METRIC_LABELS: Array<[keyof MetricValues, string]> = [
  ["impressions", "インプレッション"],
  ["likes", "いいね"],
  ["reposts", "リポスト"],
  ["quotes", "引用"],
  ["replies", "返信"],
  ["bookmarks", "ブックマーク"],
];

type MetricValues = {
  impressions: number;
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  bookmarks: number;
};

/** 実測メトリクス (DATA)。ラベルと数値の階層を分けて密度を保つ */
function MetricList({ metrics }: { metrics: MetricValues }) {
  return (
    <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
      {METRIC_LABELS.map(([key, label]) => (
        <div key={key} className="flex items-baseline gap-1.5">
          <dt className="text-[11px] text-ink-400">{label}</dt>
          <dd className="text-xs font-semibold tabular-nums text-ink-700">
            {formatNumber(metrics[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
