import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { SubmitButton, selectClassName } from "@/components/form";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  NextActionButton,
  PageHeader,
  formatDateTime,
  formatNumber,
} from "@/components/ui";

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-700";

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
        eyebrow="調べる"
        title="検索"
        description="取得済みのベンチマーク投稿を横断検索します（DB内検索のためAPIコストは掛かりません）。"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="検索条件"
            description="複数の条件を組み合わせて、取得済みの投稿プールを絞り込みます。"
          />
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1">
              <span className={LABEL}>キーワード</span>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="本文に含まれる語句"
                className={selectClassName}
              />
            </label>

            <label className="w-48">
              <span className={LABEL}>アカウント</span>
              <select
                name="account"
                defaultValue={account ?? ""}
                className={selectClassName}
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
              <span className={LABEL}>いいね数以上</span>
              <input
                name="minLikes"
                type="number"
                min={0}
                defaultValue={minLikes ?? ""}
                className={`${selectClassName} tabular-nums`}
              />
            </label>

            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-[13px] text-ink-600">
              <input
                type="checkbox"
                name="saved"
                value="1"
                defaultChecked={saved === "1"}
                className="h-4 w-4 rounded border-ink-300 accent-brand-600"
              />
              保存済みのみ
            </label>

            <div className="w-28">
              <SubmitButton pendingLabel="検索中...">検索</SubmitButton>
            </div>
          </form>
        </Card>

        {!hasQuery ? (
          <EmptyState
            title="条件を指定して検索してください"
            description="キーワード・アカウント・いいね数・保存済みで、取得済みの投稿プールを絞り込めます。まずはキーワードを入れて検索してみてください。"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="該当する投稿がありません"
            description="条件を変えるか、リサーチで投稿プールを増やしてください。"
            action={<LinkButton href="/research">リサーチへ</LinkButton>}
          />
        ) : (
          <Card>
            <CardHeader
              title="検索結果"
              description={`${filtered.length} 件（いいね数順・最大50件表示）`}
            />
            <ul className="divide-y divide-ink-100">
              {filtered.map((post) => {
                const m = post.metrics[0];
                return (
                  <li key={post.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-500">
                      <span className="font-semibold text-ink-800">
                        @{post.authorHandle}
                      </span>
                      <span className="tabular-nums text-ink-400">
                        {formatDateTime(post.postedAt)}
                      </span>
                      <span className="tabular-nums">
                        いいね{" "}
                        <span className="font-semibold text-ink-700">
                          {formatNumber(m?.likes ?? 0)}
                        </span>
                      </span>
                      {post.analyses[0]?.templateType ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                          {post.analyses[0].templateType}
                        </span>
                      ) : null}
                      {post.modelPosts.length > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          保存済み
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                      {post.text}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
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
