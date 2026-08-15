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
 * MODEL LIBRARY (F-16)。
 * 保存した投稿の一覧。タグでフィルタできる。
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const userId = await requireUserId();
  const { tag } = await searchParams;

  const models = await prisma.modelPost.findMany({
    where: {
      userId,
      ...(tag ? { categoryTags: { has: tag } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
          analyses: { where: { userId }, select: { templateType: true }, take: 1 },
        },
      },
    },
  });

  const allTags = Array.from(
    new Set(
      (
        await prisma.modelPost.findMany({
          where: { userId },
          select: { categoryTags: true },
        })
      ).flatMap((m) => m.categoryTags),
    ),
  ).sort();

  return (
    <>
      <PageHeader
        title="MODEL LIBRARY"
        description="モデリングの元にしたい投稿の保管庫です。ここに貯めた投稿の「型」を転用して自分の投稿を生成します。"
      />

      {allTags.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">タグ</span>
          <Link
            href="/library"
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              !tag
                ? "bg-brand-600 text-white"
                : "border border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            すべて
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/library?tag=${encodeURIComponent(t)}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                tag === t
                  ? "bg-brand-600 text-white"
                  : "border border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      ) : null}

      {models.length === 0 ? (
        <EmptyState
          title="保存された投稿がありません"
          description="リサーチ結果から気になる投稿を開き、「ライブラリに保存」してください。外れ値スコアが高い投稿がモデリング候補として有力です。"
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
        <div className="grid gap-4 lg:grid-cols-2">
          {models.map((model) => {
            const post = model.post;
            const m = post.metrics[0];
            const templateType = post.analyses[0]?.templateType;
            return (
              <Card key={model.id}>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {model.categoryTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700"
                    >
                      {t}
                    </span>
                  ))}
                  {templateType ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {templateType}
                    </span>
                  ) : null}
                </div>

                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
                  {post.text}
                </p>

                <p className="mt-2 text-xs text-ink-500">
                  @{post.authorHandle} · いいね {formatNumber(m?.likes ?? 0)} ·
                  保存 {formatDateTime(model.createdAt)}
                </p>
                {model.memo ? (
                  <p className="mt-1 text-xs text-ink-400">{model.memo}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <NextActionButton href={`/posts/${post.id}`}>
                    分析カードを開く
                  </NextActionButton>
                  <NextActionButton href="#" disabled title="スライス3で実装予定">
                    この型で作る
                  </NextActionButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
