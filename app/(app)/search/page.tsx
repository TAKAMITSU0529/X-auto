import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  EmptyState,
  NextActionButton,
  PageHeader,
  formatDateTime,
  formatNumber,
} from "@/components/ui";

/**
 * 検索・フィルタ (F-24)。
 * 取得済みの全ベンチマーク投稿を横断検索する (追加APIコストゼロ)。
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    account?: string;
    minLikes?: string;
    saved?: string;
  }>;
}) {
  const userId = await requireUserId();
  const { q, account, minLikes, saved } = await searchParams;

  const accounts = await prisma.benchmarkAccount.findMany({
    where: { list: { userId } },
    orderBy: { handle: "asc" },
    select: { id: true, handle: true },
  });

  const hasQuery = Boolean(q || account || minLikes || saved);
  const minLikesNum = Number(minLikes) || 0;

  const results = hasQuery
    ? await prisma.post.findMany({
        where: {
          benchmarkAccount: { list: { userId } },
          ...(q ? { text: { contains: q, mode: "insensitive" } } : {}),
          ...(account ? { benchmarkAccountId: account } : {}),
          ...(saved === "1" ? { modelPosts: { some: { userId } } } : {}),
        },
        include: {
          metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
          analyses: {
            where: { userId },
            select: { templateType: true },
            take: 1,
          },
          modelPosts: { where: { userId }, select: { id: true }, take: 1 },
        },
        orderBy: { postedAt: "desc" },
        take: 200,
      })
    : [];

  const filtered = results
    .filter((post) => (post.metrics[0]?.likes ?? 0) >= minLikesNum)
    .sort(
      (a, b) => (b.metrics[0]?.likes ?? 0) - (a.metrics[0]?.likes ?? 0),
    )
    .slice(0, 50);

  return (
    <>
      <PageHeader
        title="検索"
        description="取得済みのベンチマーク投稿を横断検索します（DB内検索のためAPIコストは掛かりません）。"
      />

      <div className="space-y-6">
        <Card>
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">
                キーワード
              </span>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="本文に含まれる語句"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="w-48">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">
                アカウント
              </span>
              <select
                name="account"
                defaultValue={account ?? ""}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
              >
                <option value="">すべて</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.handle}
                  </option>
                ))}
              </select>
            </label>

            <label className="w-32">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">
                いいね数以上
              </span>
              <input
                name="minLikes"
                type="number"
                min={0}
                defaultValue={minLikes ?? ""}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
              />
            </label>

            <label className="flex items-center gap-2 pb-2 text-sm text-ink-600">
              <input
                type="checkbox"
                name="saved"
                value="1"
                defaultChecked={saved === "1"}
                className="h-4 w-4 rounded border-ink-300"
              />
              保存済みのみ
            </label>

            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              検索
            </button>
          </form>
        </Card>

        {!hasQuery ? (
          <EmptyState
            title="条件を指定して検索してください"
            description="キーワード・アカウント・いいね数・保存済みで、取得済みの投稿プールを絞り込めます。"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="該当する投稿がありません"
            description="条件を変えるか、リサーチで投稿プールを増やしてください。"
            action={
              <Link
                href="/research"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                リサーチへ
              </Link>
            }
          />
        ) : (
          <Card>
            <p className="mb-3 text-xs text-ink-500">
              {filtered.length} 件（いいね数順・最大50件表示）
            </p>
            <ul className="divide-y divide-ink-100">
              {filtered.map((post) => {
                const m = post.metrics[0];
                return (
                  <li key={post.id} className="py-4">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span className="font-medium text-ink-700">
                        @{post.authorHandle}
                      </span>
                      <span>{formatDateTime(post.postedAt)}</span>
                      <span>いいね {formatNumber(m?.likes ?? 0)}</span>
                      {post.analyses[0]?.templateType ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                          {post.analyses[0].templateType}
                        </span>
                      ) : null}
                      {post.modelPosts.length > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          保存済み
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
                      {post.text}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <NextActionButton href={`/posts/${post.id}`}>
                        この投稿を分析
                      </NextActionButton>
                      <NextActionButton href={`/generate?source=${post.id}`}>
                        この型で作る
                      </NextActionButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
