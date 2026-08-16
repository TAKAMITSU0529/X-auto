import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  Card,
  EmptyState,
  LinkButton,
  NextActionButton,
  PageHeader,
  Tag,
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

  const patterns = await prisma.winningPattern.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
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
        eyebrow="調べる"
        title="MODEL LIBRARY"
        description="モデリングの元にしたい投稿の保管庫です。ここに貯めた投稿の「型」を転用して自分の投稿を生成します。"
      />

      {patterns.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            WINNING PATTERN（一括分析から自動抽出）
          </h2>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {patterns.map((pattern) => {
              const json = pattern.patternJson as {
                description?: string;
                steps?: string[];
                hookHint?: string;
                sourceAccount?: string;
              };
              return (
                <Card key={pattern.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink-900">
                      {pattern.name}
                    </p>
                    {pattern.avgPerformance ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-200">
                        平均 通常の{Number(pattern.avgPerformance).toFixed(1)}倍
                      </span>
                    ) : null}
                    <Tag tone="hypothesis">AI推定</Tag>
                  </div>
                  {json.description ? (
                    <p className="text-xs leading-relaxed text-ink-600">
                      {json.description}
                    </p>
                  ) : null}
                  {json.steps?.length ? (
                    <p className="mt-2 rounded-lg border border-ink-100 bg-ink-25 px-2.5 py-1.5 text-xs leading-relaxed text-ink-500">
                      {json.steps.join(" → ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs tabular-nums text-ink-400">
                    {json.sourceAccount ? `@${json.sourceAccount} · ` : ""}
                    抽出元 {pattern.sourcePostIds.length} 投稿
                  </p>
                  <div className="mt-3 pt-1">
                    <NextActionButton href={`/generate?pattern=${pattern.id}`}>
                      この型で作る
                    </NextActionButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {allTags.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            タグ
          </span>
          <FilterChip href="/library" active={!tag}>
            すべて
          </FilterChip>
          {allTags.map((t) => (
            <FilterChip
              key={t}
              href={`/library?tag=${encodeURIComponent(t)}`}
              active={tag === t}
            >
              {t}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {models.length === 0 ? (
        <EmptyState
          title="保存された投稿がありません"
          description="リサーチ結果から気になる投稿を開き、「ライブラリに保存」してください。外れ値スコアが高い投稿がモデリング候補として有力です。"
          action={<LinkButton href="/research">リサーチへ</LinkButton>}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {models.map((model) => {
            const post = model.post;
            const m = post.metrics[0];
            const templateType = post.analyses[0]?.templateType;
            return (
              <Card key={model.id}>
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                  {model.categoryTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700"
                    >
                      {t}
                    </span>
                  ))}
                  {templateType ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      {templateType}
                    </span>
                  ) : null}
                </div>

                <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                  {post.text}
                </p>

                <p className="mt-2.5 text-xs tabular-nums text-ink-500">
                  @{post.authorHandle} · いいね {formatNumber(m?.likes ?? 0)} ·
                  保存 {formatDateTime(model.createdAt)}
                </p>
                {model.memo ? (
                  <p className="mt-1.5 border-l-2 border-ink-200 pl-2.5 text-xs leading-relaxed text-ink-500">
                    {model.memo}
                  </p>
                ) : null}

                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-ink-100 pt-3.5">
                  <NextActionButton href={`/posts/${post.id}`}>
                    分析カードを開く
                  </NextActionButton>
                  <NextActionButton href={`/generate?source=${post.id}`}>
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

/** 一覧の絞り込みチップ */
function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition duration-200 ${
        active
          ? "bg-brand-600 text-white shadow-xs"
          : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50"
      }`}
    >
      {children}
    </Link>
  );
}
