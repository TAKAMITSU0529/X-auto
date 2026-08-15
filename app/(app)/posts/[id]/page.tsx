import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getRankedPosts } from "@/lib/research/service";
import type { PostAnalysisResult, StructureBlock } from "@/lib/ai";
import {
  Card,
  DataNote,
  HypothesisNote,
  NextActionButton,
  OutlierBadge,
  PageHeader,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { AnalyzeButton } from "./analyze-button";
import { SaveToLibraryForm } from "./save-form";
import { removeFromLibraryAction } from "./actions";

/**
 * 投稿詳細 = 分析カード画面 (F-04 / F-16)。
 * 要件定義 §8.1 の3段構成:
 *   1段目 = DATA (メトリクスと外れ値スコア)
 *   2段目 = AI解説 (分析結果、AI推定として表示)
 *   3段目 = 次にやること (分析する / 保存する / この型で作る)
 */
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, benchmarkAccount: { list: { userId } } },
    include: {
      benchmarkAccount: true,
      metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      analyses: { where: { userId }, take: 1 },
      modelPosts: { where: { userId }, take: 1 },
    },
  });

  if (!post || !post.benchmarkAccount) notFound();

  // 外れ値スコアはアカウント全体のベースラインに対して計算する
  const ranking = await getRankedPosts({
    userId,
    benchmarkAccountId: post.benchmarkAccount.id,
    sortBy: "outlier",
  });
  const ranked = ranking?.posts.find((p) => p.id === post.id);

  const analysis = post.analyses[0] ?? null;
  const saved = post.modelPosts[0] ?? null;
  const m = post.metrics[0];

  const structure =
    (analysis?.structureJson as unknown as StructureBlock[] | null) ?? [];
  const insight =
    (analysis?.insightJson as PostAnalysisResult["insight"] | null) ?? null;
  const specificity =
    (analysis?.specificityJson as PostAnalysisResult["specificity"] | null) ??
    null;

  return (
    <>
      <PageHeader
        title={`@${post.authorHandle} の投稿`}
        description={`投稿日時 ${formatDateTime(post.postedAt)}`}
        action={
          <Link
            href={`/research?account=${post.benchmarkAccount.id}&sort=outlier`}
            className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
          >
            ← ランキングへ戻る
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* 本文 + 1段目: DATA */}
          <Card>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900">
              {post.text}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {ranked ? <OutlierBadge score={ranked.outlierScore} /> : null}
              {ranked ? (
                <span className="text-xs text-ink-500">
                  ER {formatPercent(ranked.engagementRate)}
                  {ranked.engagementBasis === "followers"
                    ? "（フォロワー数基準）"
                    : ""}
                  {" · 通常ER "}
                  {formatPercent(ranking!.baseline.baselineRate)}
                </span>
              ) : null}
              {post.permalink ? (
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline"
                >
                  元投稿を開く
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-ink-500">
              <span>インプレッション {formatNumber(m?.impressions ?? 0)}</span>
              <span>いいね {formatNumber(m?.likes ?? 0)}</span>
              <span>リポスト {formatNumber(m?.reposts ?? 0)}</span>
              <span>引用 {formatNumber(m?.quotes ?? 0)}</span>
              <span>返信 {formatNumber(m?.replies ?? 0)}</span>
              <span>ブックマーク {formatNumber(m?.bookmarks ?? 0)}</span>
            </div>
          </Card>

          {/* 2段目: AI分析 (F-04) */}
          {analysis ? (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">
                  AI分析カード
                </h2>
                <span className="text-xs text-ink-400">
                  {formatDateTime(analysis.createdAt)} · モデル:{" "}
                  {analysis.model ?? "-"}
                </span>
              </div>

              <div className="mb-4">
                <HypothesisNote>
                  以下はAIによる推定（マーケティング仮説）であり、確認された事実ではありません。
                </HypothesisNote>
              </div>

              <dl className="space-y-4 text-sm">
                <AnalysisRow label="① テーマ" value={analysis.theme} />
                <AnalysisRow label="② ターゲット" value={analysis.targetAudience} />

                {insight ? (
                  <div>
                    <dt className="mb-1.5 font-semibold text-ink-700">
                      ③ インサイト
                    </dt>
                    <dd className="grid gap-1.5 sm:grid-cols-2">
                      <InsightItem label="不満" value={insight.dissatisfaction} />
                      <InsightItem label="欲求" value={insight.desire} />
                      <InsightItem label="不安" value={insight.anxiety} />
                      <InsightItem label="課題" value={insight.problem} />
                      <InsightItem label="理想" value={insight.ideal} />
                      <InsightItem label="思い込み" value={insight.assumption} />
                    </dd>
                  </div>
                ) : null}

                {structure.length > 0 ? (
                  <div>
                    <dt className="mb-1.5 font-semibold text-ink-700">
                      ④ 投稿構成
                      {analysis.templateType ? (
                        <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                          {analysis.templateType}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="space-y-1.5">
                      {structure.map((block, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2"
                        >
                          <span className="mr-2 text-xs font-semibold text-brand-700">
                            {block.label}
                          </span>
                          <span className="text-ink-700">{block.text}</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                ) : null}

                <AnalysisRow label="⑤ HOOK" value={analysis.hook} />

                {analysis.keywords.length > 0 ? (
                  <div>
                    <dt className="mb-1.5 font-semibold text-ink-700">
                      ⑥ キーワード
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {analysis.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700"
                        >
                          {k}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}

                {analysis.emotions.length > 0 ? (
                  <div>
                    <dt className="mb-1.5 font-semibold text-ink-700">⑦ 感情</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {analysis.emotions.map((e) => (
                        <span
                          key={e}
                          className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
                        >
                          {e}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}

                {specificity ? (
                  <div>
                    <dt className="mb-1.5 font-semibold text-ink-700">
                      ⑧ 具体性
                    </dt>
                    <dd className="text-ink-700">
                      {specificity.numbers.length > 0 ? (
                        <p>数字: {specificity.numbers.join("、")}</p>
                      ) : null}
                      {specificity.examples.length > 0 ? (
                        <p>実例: {specificity.examples.join("、")}</p>
                      ) : null}
                      {specificity.properNouns.length > 0 ? (
                        <p>固有名詞: {specificity.properNouns.join("、")}</p>
                      ) : null}
                      <p>
                        ストーリー性: {specificity.hasStory ? "あり" : "なし"}
                      </p>
                    </dd>
                  </div>
                ) : null}

                <AnalysisRow label="⑨ CTA" value={analysis.cta ?? "（なし）"} />
                <AnalysisRow
                  label="⑩ 反応理由（なぜ伸びた可能性が高いか）"
                  value={analysis.whyItWorks}
                />
              </dl>
            </Card>
          ) : (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-ink-900">
                AI分析カード
              </h2>
              <p className="mb-4 text-sm text-ink-500">
                まだ分析していません。「AIで分析する」を押すと、テーマ・ターゲット・構成・HOOK・キーワード・感情・CTA・反応理由の10項目を分析します。
              </p>
              <DataNote>
                メトリクスと外れ値スコアは実測値（DATA）、分析結果はAI推定（HYPOTHESIS）として区別して表示されます。
              </DataNote>
            </Card>
          )}
        </div>

        {/* 3段目: 次にやること */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              次にやること
            </h2>
            <div className="space-y-3">
              <AnalyzeButton postId={post.id} analyzed={Boolean(analysis)} />
              <NextActionButton href={`/generate?source=${post.id}`}>
                この型で作る（3案生成）
              </NextActionButton>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">
                MODEL LIBRARY
              </h2>
              {saved ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  保存済み
                </span>
              ) : null}
            </div>

            {saved ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {saved.categoryTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {saved.memo ? (
                  <p className="text-xs text-ink-500">{saved.memo}</p>
                ) : null}
                <form action={removeFromLibraryAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ライブラリから削除
                  </button>
                </form>
              </div>
            ) : (
              <SaveToLibraryForm postId={post.id} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function AnalysisRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="mb-1 font-semibold text-ink-700">{label}</dt>
      <dd className="whitespace-pre-wrap text-ink-800">{value}</dd>
    </div>
  );
}

function InsightItem({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-ink-100 px-2.5 py-1.5">
      <span className="mr-1.5 text-xs font-semibold text-ink-500">{label}</span>
      <span className="text-xs text-ink-800">{value}</span>
    </div>
  );
}
