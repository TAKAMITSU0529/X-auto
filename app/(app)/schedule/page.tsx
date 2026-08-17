import Link from "next/link";
import { ScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Tag,
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
  scheduled: {
    label: "予約中",
    className: "bg-brand-50 text-brand-700 ring-brand-200",
  },
  posting: {
    label: "投稿処理中",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  published: {
    label: "投稿済み",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  failed: { label: "失敗", className: "bg-rose-50 text-rose-700 ring-rose-200" },
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
        eyebrow="作る・出す"
        title="予約投稿"
        description="下書きを日時指定でXへ自動投稿します。投稿後は自己分析にメトリクスが記録されます。"
        action={<RunNowButton />}
      />

      {xAccounts.length === 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
          <span>X アカウントが未連携のため予約できません。</span>
          <Link
            href="/settings"
            className="font-semibold text-amber-900 underline underline-offset-2 transition duration-200 hover:text-amber-700"
          >
            設定画面から連携する
          </Link>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="未予約の下書き"
            description="投稿前AIチェックで点検してから、日時を指定して予約します。"
            action={
              drafts.length > 0 ? (
                <Tag tone="neutral">{drafts.length}件</Tag>
              ) : undefined
            }
          />
          {drafts.length === 0 ? (
            <EmptyState
              title="予約できる下書きがありません"
              description="生成スタジオで3案から1つを選んで下書き保存すると、ここに表示されます。"
              action={<LinkButton href="/generate">生成スタジオへ</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {drafts.map((draft) => (
                <li key={draft.id} className="py-5 first:pt-0 last:pb-0">
                  <p className="mb-3 whitespace-pre-wrap rounded-xl border border-ink-200 bg-ink-25 px-3.5 py-3 text-[13px] leading-relaxed text-ink-800">
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
          <CardHeader
            title="予約・投稿履歴"
            description="予約中・投稿処理中・投稿済み・失敗の状態を時系列で確認できます。"
            action={
              scheduledPosts.length > 0 ? (
                <Tag tone="neutral">{scheduledPosts.length}件</Tag>
              ) : undefined
            }
          />
          {scheduledPosts.length === 0 ? (
            <EmptyState
              title="まだ予約がありません"
              description="左の下書きで投稿先と日時を指定して予約すると、ここに予約と投稿結果が並びます。"
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {scheduledPosts.map((item) => {
                const badge = STATUS_BADGE[item.status];
                return (
                  <li key={item.id} className="py-3.5 first:pt-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs tabular-nums text-ink-500">
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
                            className="rounded-lg border border-ink-200 px-2 py-1 text-xs font-medium text-ink-500 shadow-xs transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            キャンセル
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
                      {item.text}
                    </p>
                    {item.threadTexts.length > 0 || item.mediaUrls.length > 0 ? (
                      <p className="mt-1 text-xs tabular-nums text-ink-400">
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
                      <p className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs leading-relaxed text-rose-700">
                        {item.error}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-400">
            予約の実行は worker（`npm run worker`）が30秒ごとに処理します。
            worker を起動していない場合は右上の「今すぐ処理」を使ってください。
          </p>
        </Card>
      </div>
    </>
  );
}
