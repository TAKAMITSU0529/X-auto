import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { DraftWithSimilarity } from "@/lib/generation/service";
import type { DraftScore } from "@/lib/ai";
import {
  Card,
  EmptyState,
  HypothesisNote,
  PageHeader,
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
        title="投稿生成スタジオ"
        description="参考投稿の「構造・心理・型」だけを転用し、内容はあなた自身の情報で3案生成します。"
      />

      {!brand ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          MY BRAND が未設定です。設定すると、生成される投稿があなたのトーン・実績・禁止事項を反映するようになります。{" "}
          <Link href="/brand" className="font-semibold underline">
            MY BRAND を設定する
          </Link>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          {pattern ? (
            <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 p-4">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-violet-700">
                  使用する勝ちパターン（AI推定）
                </p>
                <Link
                  href="/generate"
                  className="text-xs text-ink-500 hover:underline"
                >
                  パターンなしで生成する
                </Link>
              </div>
              <p className="text-sm font-semibold text-ink-900">{pattern.name}</p>
              {patternJson?.description ? (
                <p className="mt-1 text-xs text-ink-600">
                  {patternJson.description}
                </p>
              ) : null}
              {patternJson?.steps?.length ? (
                <p className="mt-1 text-xs text-ink-400">
                  {patternJson.steps.join(" → ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {sourcePost ? (
            <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 p-4">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-brand-700">
                  モデリング元（構造だけを転用します。文面はコピーされません）
                </p>
                <Link
                  href="/generate"
                  className="text-xs text-ink-500 hover:underline"
                >
                  元投稿なしで生成する
                </Link>
              </div>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink-800">
                {sourcePost.text}
              </p>
              <p className="mt-1.5 text-xs text-ink-500">
                @{sourcePost.authorHandle}
                {sourcePost.analyses[0]?.templateType
                  ? ` · 型: ${sourcePost.analyses[0].templateType}`
                  : " · 未分析（先に分析すると構造転用の精度が上がります）"}
              </p>
            </div>
          ) : null}

          {!sourcePost && !pattern ? (
            <p className="mb-5 rounded-lg bg-ink-50 px-4 py-3 text-xs text-ink-500">
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

        {generated && drafts ? (
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              生成結果 — 3案
            </h2>
            <p className="mb-4 text-xs text-ink-500">
              {formatDateTime(generated.createdAt)} 生成 ·
              案を選んで編集し、下書きとして保存できます
            </p>
            <DraftPicker
              generatedPostId={generated.id}
              drafts={drafts}
              predictedScores={predictedScores}
              alreadySaved={generated.status !== "ai_generated"}
              savedIndex={generated.selectedIndex}
            />
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            最近の下書き
          </h2>
          {recentDrafts.length === 0 ? (
            <EmptyState
              title="下書きはまだありません"
              description="3案から1つを選んで保存すると、ここに表示されます。予約投稿（次スライス）からXへ投稿します。"
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentDrafts.map((d) => (
                <li key={d.id} className="py-3">
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm text-ink-800">
                    {d.selectedText ?? "（本文未選択）"}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    {formatDateTime(d.updatedAt)} ·{" "}
                    {d.status === "draft" ? "下書き" : "承認済み"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <HypothesisNote>
          生成された投稿の「狙い・想定される反応」はAIによる推定です。事実の主張を含む場合は、投稿前に必ず事実確認をしてください。
        </HypothesisNote>
      </div>
    </>
  );
}
