import Link from "next/link";
import { ScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  EmptyState,
  PageHeader,
  formatDateTime,
} from "@/components/ui";
import { ScheduleForm } from "./schedule-form";
import { PreCheckPanel } from "./precheck-panel";
import { RunNowButton } from "./run-now-button";
import { cancelScheduleAction } from "./actions";

const STATUS_BADGE: Record<
  ScheduleStatus,
  { label: string; className: string }
> = {
  scheduled: { label: "予約中", className: "bg-brand-50 text-brand-700" },
  posting: { label: "投稿処理中", className: "bg-amber-100 text-amber-800" },
  published: { label: "投稿済み", className: "bg-emerald-100 text-emerald-700" },
  failed: { label: "失敗", className: "bg-red-100 text-red-700" },
};

/** 予約投稿 (F-07)。下書きの予約と、予約・投稿済み一覧。 */
export default async function SchedulePage() {
  const userId = await requireUserId();

  const [drafts, xAccounts, scheduledPosts] = await Promise.all([
    prisma.generatedPost.findMany({
      where: {
        userId,
        status: { in: ["draft", "approved"] },
        selectedText: { not: null },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.xAccount.findMany({ where: { userId }, orderBy: { connectedAt: "asc" } }),
    prisma.scheduledPost.findMany({
      where: { generatedPost: { userId } },
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
      include: { xAccount: { select: { handle: true } } },
      take: 50,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="予約投稿"
        description="下書きを日時指定でXへ自動投稿します。投稿後は自己分析にメトリクスが記録されます。"
        action={<RunNowButton />}
      />

      {xAccounts.length === 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          X アカウントが未連携のため予約できません。{" "}
          <Link href="/settings" className="font-semibold underline">
            設定画面から連携する
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            未予約の下書き
          </h2>
          {drafts.length === 0 ? (
            <EmptyState
              title="予約できる下書きがありません"
              description="生成スタジオで3案から1つを選んで下書き保存すると、ここに表示されます。"
              action={
                <Link
                  href="/generate"
                  className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  生成スタジオへ
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {drafts.map((draft) => (
                <li key={draft.id} className="py-4">
                  <p className="mb-3 whitespace-pre-wrap rounded-lg bg-ink-50 px-3 py-2 text-sm leading-relaxed text-ink-800">
                    {draft.selectedText}
                  </p>
                  <PreCheckPanel generatedPostId={draft.id} />
                  <ScheduleForm
                    generatedPostId={draft.id}
                    accounts={xAccounts.map((a) => ({
                      id: a.id,
                      handle: a.handle,
                    }))}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            予約・投稿履歴
          </h2>
          {scheduledPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              まだ予約がありません。
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {scheduledPosts.map((item) => {
                const badge = STATUS_BADGE[item.status];
                return (
                  <li key={item.id} className="py-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-ink-500">
                        @{item.xAccount.handle} ·{" "}
                        {item.status === "published" && item.postedAt
                          ? `投稿 ${formatDateTime(item.postedAt)}`
                          : `予定 ${formatDateTime(item.scheduledAt)}`}
                      </span>
                      {item.status === "scheduled" ? (
                        <form action={cancelScheduleAction} className="ml-auto">
                          <input
                            type="hidden"
                            name="scheduledPostId"
                            value={item.id}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            キャンセル
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm text-ink-700">
                      {item.text}
                    </p>
                    {item.threadTexts.length > 0 || item.mediaUrls.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-400">
                        {item.threadTexts.length > 0
                          ? `スレッド全${item.threadTexts.length + 1}投稿`
                          : null}
                        {item.threadTexts.length > 0 && item.mediaUrls.length > 0
                          ? " · "
                          : null}
                        {item.mediaUrls.length > 0
                          ? `画像${item.mediaUrls.length}枚`
                          : null}
                      </p>
                    ) : null}
                    {item.error ? (
                      <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                        {item.error}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-400">
            予約の実行は worker（`npm run worker`）が30秒ごとに処理します。
            worker を起動していない場合は右上の「今すぐ処理」を使ってください。
          </p>
        </Card>
      </div>
    </>
  );
}
