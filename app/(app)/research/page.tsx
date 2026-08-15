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
  DataNote,
  EmptyState,
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
        title="リサーチ"
        description="ベンチマークアカウントの投稿を取得し、そのアカウントの通常成績と比べて伸びた投稿を見つけます。"
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="ベンチマークアカウントが未登録です"
          description="リサーチを実行するには、先にベンチマークアカウントを登録してください。"
          action={
            <Link
              href="/benchmarks"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              ベンチマークを登録する
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-ink-900">
              リサーチを実行
            </h2>
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
                />
                <StatTile
                  label="フォロワー"
                  value={formatNumber(ranking.account.followers)}
                  sub={ranking.account.displayName ?? ""}
                />
              </div>

              {!ranking.baseline.reliable ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  ベースラインの算出サンプルが {ranking.baseline.sampleSize} 件と少ないため、
                  外れ値スコアの信頼性は限定的です（{MIN_BASELINE_SAMPLE} 件以上を推奨）。
                  取得件数を増やして再実行してください。
                </div>
              ) : null}

              <DataNote>
                外れ値スコアは「その投稿のエンゲージメント率 ÷ このアカウントの通常エンゲージメント率（中央値）」で算出した実測値です。
                SCORE は外れ値・量・質・新しさを合成した X AUTO IMPACT SCORE です。伸びた理由の解釈は各投稿の「この投稿を分析」から確認できます。
              </DataNote>

              <Card>
                <BatchAnalyzeForm accountId={accountId!} />
              </Card>

              <Card>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">
                    並び替え
                  </span>
                  {SORT_KEYS.map((key) => (
                    <Link
                      key={key}
                      href={`/research?account=${accountId}&sort=${key}`}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        sortBy === key
                          ? "bg-brand-600 text-white"
                          : "border border-ink-200 text-ink-600 hover:bg-ink-50"
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </Link>
                  ))}
                </div>

                {ranking.posts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-500">
                    まだ投稿が取得されていません。上のフォームからリサーチを実行してください。
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {ranking.posts.slice(0, 50).map((post, index) => (
                      <li key={post.id} className="py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-400">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <OutlierBadge score={post.outlierScore} />
                              <span
                                className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-700"
                                title="X AUTO IMPACT SCORE (実測値からの合成指標)"
                              >
                                SCORE {post.impactScore}
                              </span>
                              <span className="text-xs text-ink-400">
                                ER {formatPercent(post.engagementRate)}
                                {post.engagementBasis === "followers"
                                  ? "（フォロワー数基準）"
                                  : ""}
                              </span>
                              <span className="text-xs text-ink-400">
                                {formatDateTime(post.postedAt)}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
                              {post.text.length > 220
                                ? `${post.text.slice(0, 220)}…`
                                : post.text}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-ink-500">
                              <span>
                                インプレッション {formatNumber(post.metrics.impressions)}
                              </span>
                              <span>いいね {formatNumber(post.metrics.likes)}</span>
                              <span>リポスト {formatNumber(post.metrics.reposts)}</span>
                              <span>引用 {formatNumber(post.metrics.quotes)}</span>
                              <span>返信 {formatNumber(post.metrics.replies)}</span>
                              <span>ブックマーク {formatNumber(post.metrics.bookmarks)}</span>
                            </div>

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
                                  className="text-xs text-brand-600 hover:underline"
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
