import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  formatDateTime,
  formatNumber,
} from "@/components/ui";
import { CreateListForm } from "./create-list-form";
import { AddAccountForm } from "./add-account-form";
import { deleteAccountAction, deleteListAction } from "./actions";

const DANGER_BUTTON =
  "rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-500 shadow-xs transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600";

export default async function BenchmarksPage() {
  const userId = await requireUserId();

  const lists = await prisma.benchmarkList.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      accounts: { orderBy: { registeredAt: "desc" } },
    },
  });

  const accountTotal = lists.reduce((sum, list) => sum + list.accounts.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="調べる"
        title="ベンチマーク"
        description="参考にしたいアカウントをリストで管理します。ここに登録したアカウントがリサーチの対象になります。"
        action={
          accountTotal > 0 ? (
            <LinkButton href="/research" variant="secondary">
              リサーチへ進む
            </LinkButton>
          ) : null
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader
            title="リストを追加"
            description="発信ジャンルごとに分けると、あとの分析が比較しやすくなります。"
          />
          <CreateListForm />
        </Card>

        <div className="space-y-6">
          {lists.length === 0 ? (
            <EmptyState
              title="まだリストがありません"
              description="「AI経営者」「店舗集客系」のように、発信ジャンルごとにリストを作ると分析しやすくなります。左の「リストを追加」から最初のリストを作成してください。"
            />
          ) : (
            lists.map((list) => (
              <Card key={list.id}>
                <CardHeader
                  title={list.name}
                  description={`${list.genreTag ? `${list.genreTag} · ` : ""}${list.accounts.length} アカウント`}
                  action={
                    <form action={deleteListAction}>
                      <input type="hidden" name="listId" value={list.id} />
                      <button type="submit" className={DANGER_BUTTON}>
                        リスト削除
                      </button>
                    </form>
                  }
                />

                {list.memo ? (
                  <p className="mb-4 rounded-lg border border-ink-100 bg-ink-25 px-3 py-2 text-xs leading-relaxed text-ink-500">
                    {list.memo}
                  </p>
                ) : null}

                {list.accounts.length === 0 ? (
                  <EmptyState
                    title="アカウントが未登録です"
                    description="下のフォームから @ID またはプロフィールURLを追加すると、このリストがリサーチの対象になります。"
                  />
                ) : (
                  <ul className="divide-y divide-ink-100 border-y border-ink-100">
                    {list.accounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink-900">
                            {account.displayName ?? account.handle}
                            <span className="ml-1.5 font-normal text-ink-400">
                              @{account.handle}
                            </span>
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                            <span>
                              フォロワー{" "}
                              <span className="font-medium tabular-nums text-ink-700">
                                {formatNumber(account.followers)}
                              </span>
                            </span>
                            <span>
                              投稿{" "}
                              <span className="font-medium tabular-nums text-ink-700">
                                {formatNumber(account.postsCount)}
                              </span>
                            </span>
                            <span className="tabular-nums text-ink-400">
                              {account.lastAnalyzedAt
                                ? `最終リサーチ ${formatDateTime(account.lastAnalyzedAt)}`
                                : "未リサーチ"}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <LinkButton
                            href={`/research?account=${account.id}`}
                            size="sm"
                          >
                            リサーチ
                          </LinkButton>
                          <form action={deleteAccountAction}>
                            <input
                              type="hidden"
                              name="accountId"
                              value={account.id}
                            />
                            <button type="submit" className={DANGER_BUTTON}>
                              削除
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
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
