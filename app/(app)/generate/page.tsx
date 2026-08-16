import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { DraftWithSimilarity } from "@/lib/generation/service";
import type { DraftScore } from "@/lib/ai";
import {
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  LinkButton,
  PageHeader,
  Tag,
  formatDateTime,
} from "@/components/ui";
import { GenerateForm } from "./generate-form";
import { DraftPicker } from "./draft-picker";

/**
 * 投稿生成スタジオ (F-05 モデリング再生成 / F-06 3案生成)。
 *
 * ?source=<postId> でモデリング元を指定して開く (投稿詳細・ライブラリから遷移)。
 * ?g=<generatedPostId> で生成結果を表示する。
 */
export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string;
    g?: string;
    pattern?: string;
    genre?: string;
    message?: string;
  }>;
}) {
  const userId = await requireUserId();
  const {
    source: sourcePostId,
    g: generatedId,
    pattern: patternId,
    genre: defaultGenre,
    message: defaultMessage,
  } = await searchParams;

  const [sourcePost, pattern, brand, generated, recentDrafts] = await Promise.all([
    sourcePostId
      ? prisma.post.findFirst({
          where: {
            id: sourcePostId,
            benchmarkAccount: { list: { userId } },
          },
          include: {
            analyses: {
              where: { userId },
              select: { templateType: true, hook: true },
              take: 1,
            },
          },
        })
      : null,
    patternId
      ? prisma.winningPattern.findFirst({
          where: { id: patternId, userId },
        })
      : null,
    prisma.brandProfile.findUnique({ where: { userId } }),
    generatedId
      ? prisma.generatedPost.findFirst({
          where: { id: generatedId, userId },
        })
      : null,
    prisma.generatedPost.findMany({
      where: { userId, status: { in: ["draft", "approved"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const drafts =
    (generated?.draftsJson as unknown as DraftWithSimilarity[] | null) ?? null;
  const predictedScores =
    (generated?.predictedScores as unknown as DraftScore[] | null) ?? null;
  const patternJson = pattern?.patternJson as {
    description?: string;
    steps?: string[];
    hookHint?: string;
  } | null;

  return (
    <>
      <PageHeader
        eyebrow="作る・出す"
        title="投稿生成スタジオ"
        description="参考投稿の「構造・心理・型」だけを転用し、内容はあなた自身の情報で3案生成します。"
      />

      {!brand ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
          <span>
            MY BRAND
            が未設定です。設定すると、生成される投稿があなたのトーン・実績・禁止事項を反映するようになります。
          </span>
          <Link
            href="/brand"
            className="font-semibold text-amber-900 underline underline-offset-2 transition duration-200 hover:text-amber-700"
          >
            MY BRAND を設定する
          </Link>
        </div>
      ) : null}

      <div className="space-y-6">
        {generated && drafts ? (
          <Card>
            <CardHeader
              title="生成結果 — 3案"
              description={`${formatDateTime(generated.createdAt)} 生成 · 案を選んで編集し、下書きとして保存できます`}
              action={<Tag tone="hypothesis">AI生成</Tag>}
            />
            <DraftPicker
              generatedPostId={generated.id}
              drafts={drafts}
              predictedScores={predictedScores}
              alreadySaved={generated.status !== "ai_generated"}
              savedIndex={generated.selectedIndex}
            />
          </Card>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="生成条件"
              description="ジャンル・目的・伝えたいことを指定すると、切り口の違う3案を作ります。"
            />

            {pattern ? (
              <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">
                    <Tag tone="hypothesis">AI推定</Tag>
                    使用する勝ちパターン
                  </p>
                  <Link
                    href="/generate"
                    className="text-xs text-ink-500 underline-offset-2 transition duration-200 hover:text-ink-800 hover:underline"
                  >
                    パターンなしで生成する
                  </Link>
                </div>
                <p className="text-[13px] font-semibold text-ink-900">
                  {pattern.name}
                </p>
                {patternJson?.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">
                    {patternJson.description}
                  </p>
                ) : null}
                {patternJson?.steps?.length ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                    {patternJson.steps.join(" → ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {sourcePost ? (
              <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-700">
                    モデリング元（構造だけを転用します。文面はコピーされません）
                  </p>
                  <Link
                    href="/generate"
                    className="text-xs text-ink-500 underline-offset-2 transition duration-200 hover:text-ink-800 hover:underline"
                  >
                    元投稿なしで生成する
                  </Link>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                  {sourcePost.text}
                </p>
                <p className="mt-2 text-xs text-ink-500">
                  @{sourcePost.authorHandle}
                  {sourcePost.analyses[0]?.templateType
                    ? ` · 型: ${sourcePost.analyses[0].templateType}`
                    : " · 未分析（先に分析すると構造転用の精度が上がります）"}
                </p>
              </div>
            ) : null}

            {!sourcePost && !pattern ? (
              <p className="mb-5 rounded-xl border border-ink-200 bg-ink-25 px-4 py-3 text-xs leading-relaxed text-ink-500">
                モデリング元が未指定です。リサーチ結果やライブラリの「この型で作る」から開くと、その投稿・パターンの型を転用できます。このままゼロベースで生成することもできます。
              </p>
            ) : null}

            <GenerateForm
              sourcePostId={sourcePost?.id}
              patternId={pattern?.id}
              defaultGenre={defaultGenre}
              defaultMessage={defaultMessage}
            />
          </Card>

          <Card>
            <CardHeader
              title="最近の下書き"
              action={
                recentDrafts.length > 0 ? (
                  <Tag tone="neutral">{recentDrafts.length}件</Tag>
                ) : undefined
              }
            />
            {recentDrafts.length === 0 ? (
              <EmptyState
                title="下書きはまだありません"
                description="3案から1つを選んで保存すると、ここに表示されます。予約投稿（次スライス）からXへ投稿します。"
              />
            ) : (
              <>
                <ul className="divide-y divide-ink-100">
                  {recentDrafts.map((d) => (
                    <li key={d.id} className="py-3 first:pt-0">
                      <p className="line-clamp-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                        {d.selectedText ?? "（本文未選択）"}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                        <Tag tone={d.status === "draft" ? "neutral" : "brand"}>
                          {d.status === "draft" ? "下書き" : "承認済み"}
                        </Tag>
                        <span className="tabular-nums">
                          {formatDateTime(d.updatedAt)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <LinkButton href="/schedule" variant="secondary" size="sm">
                    予約投稿で日時を指定する
                  </LinkButton>
                </div>
              </>
            )}
          </Card>
        </div>

        <HypothesisNote>
          生成された投稿の「狙い・想定される反応」はAIによる推定です。事実の主張を含む場合は、投稿前に必ず事実確認をしてください。
        </HypothesisNote>
      </div>
    </>
  );
}
