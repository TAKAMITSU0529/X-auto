import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  EmptyState,
  PageHeader,
  formatDateTime,
  formatNumber,
} from "@/components/ui";
import { CreateListForm } from "./create-list-form";
import { AddAccountForm } from "./add-account-form";
import { deleteAccountAction, deleteListAction } from "./actions";

export default async function BenchmarksPage() {
  const userId = await requireUserId();

  const lists = await prisma.benchmarkList.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      accounts: { orderBy: { registeredAt: "desc" } },
    },
  });

  return (
    <>
      <PageHeader
        title="ベンチマーク"
        description="参考にしたいアカウントをリストで管理します。ここに登録したアカウントがリサーチの対象になります。"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-ink-900">
              リストを追加
            </h2>
            <CreateListForm />
          </Card>
        </div>

        <div className="space-y-6">
          {lists.length === 0 ? (
            <EmptyState
              title="まだリストがありません"
              description="「AI経営者」「店舗集客系」のように、発信ジャンルごとにリストを作ると分析しやすくなります。"
            />
          ) : (
            lists.map((list) => (
              <Card key={list.id}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-ink-900">{list.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {list.genreTag ? `${list.genreTag} · ` : ""}
                      {list.accounts.length} アカウント
                    </p>
                    {list.memo ? (
                      <p className="mt-1 text-xs text-ink-400">{list.memo}</p>
                    ) : null}
                  </div>
                  <form action={deleteListAction}>
                    <input type="hidden" name="listId" value={list.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      リスト削除
                    </button>
                  </form>
                </div>

                {list.accounts.length === 0 ? (
                  <p className="mb-4 rounded-lg bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
                    アカウントが未登録です。下のフォームから @ID を追加してください。
                  </p>
                ) : (
                  <ul className="mb-4 divide-y divide-ink-100">
                    {list.accounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {account.displayName ?? account.handle}
                            <span className="ml-1.5 font-normal text-ink-400">
                              @{account.handle}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            フォロワー {formatNumber(account.followers)} ·{" "}
                            投稿 {formatNumber(account.postsCount)}
                            {account.lastAnalyzedAt
                              ? ` · 最終リサーチ ${formatDateTime(account.lastAnalyzedAt)}`
                              : " · 未リサーチ"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/research?account=${account.id}`}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                          >
                            リサーチ
                          </Link>
                          <form action={deleteAccountAction}>
                            <input
                              type="hidden"
                              name="accountId"
                              value={account.id}
                            />
                            <button
                              type="submit"
                              className="rounded-md border border-ink-200 px-2 py-1.5 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              削除
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-ink-100 pt-4">
                  <AddAccountForm listId={list.id} />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
