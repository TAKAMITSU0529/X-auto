import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getRankedPosts } from "@/lib/research/service";
import type { PostAnalysisResult, StructureBlock } from "@/lib/ai";
import {
  Card,
  CardHeader,
  DataNote,
  HypothesisNote,
  LinkButton,
  NextActionButton,
  OutlierBadge,
  PageHeader,
  Tag,
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

  const metrics: Array<[string, number]> = [
    ["インプレッション", m?.impressions ?? 0],
    ["いいね", m?.likes ?? 0],
    ["リポスト", m?.reposts ?? 0],
    ["引用", m?.quotes ?? 0],
    ["返信", m?.replies ?? 0],
    ["ブックマーク", m?.bookmarks ?? 0],
  ];

  return (
    <>
      <PageHeader
        eyebrow="調べる"
        title={`@${post.authorHandle} の投稿`}
        description={`投稿日時 ${formatDateTime(post.postedAt)}`}
        action={
          <LinkButton
            href={`/research?account=${post.benchmarkAccount.id}&sort=outlier`}
            variant="secondary"
            size="sm"
          >
            ← ランキングへ戻る
          </LinkButton>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* 本文 + 1段目: DATA */}
          <Card>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900">
              {post.text}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-100 pt-4">
              {ranked ? <OutlierBadge score={ranked.outlierScore} /> : null}
              {ranked ? (
                <span className="text-xs tabular-nums text-ink-500">
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
                  className="ml-auto text-xs font-medium text-brand-600 transition duration-200 hover:text-brand-700 hover:underline"
                >
                  元投稿を開く
                </a>
              ) : null}
            </div>

            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-ink-400">{label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink-900">
                    {formatNumber(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* 2段目: AI分析 (F-04) */}
          {analysis ? (
            <Card>
              <CardHeader
                title="AI分析カード"
                action={
                  <span className="text-xs tabular-nums text-ink-400">
                    {formatDateTime(analysis.createdAt)} · モデル:{" "}
                    {analysis.model ?? "-"}
                  </span>
                }
              />

              <div className="mb-4">
                <HypothesisNote>
                  以下はAIによる推定（マーケティング仮説）であり、確認された事実ではありません。
                </HypothesisNote>
              </div>

              <dl className="divide-y divide-ink-100">
                <AnalysisRow label="① テーマ" value={analysis.theme} />
                <AnalysisRow
                  label="② ターゲット"
                  value={analysis.targetAudience}
                />

                {insight ? (
                  <AnalysisBlock label="③ インサイト">
                    <div className="grid items-start gap-1.5 sm:grid-cols-2">
                      <InsightItem label="不満" value={insight.dissatisfaction} />
                      <InsightItem label="欲求" value={insight.desire} />
                      <InsightItem label="不安" value={insight.anxiety} />
                      <InsightItem label="課題" value={insight.problem} />
                      <InsightItem label="理想" value={insight.ideal} />
                      <InsightItem label="思い込み" value={insight.assumption} />
                    </div>
                  </AnalysisBlock>
                ) : null}

                {structure.length > 0 ? (
                  <AnalysisBlock
                    label="④ 投稿構成"
                    badge={
                      analysis.templateType ? (
                        <Tag tone="brand">{analysis.templateType}</Tag>
                      ) : null
                    }
                  >
                    <div className="space-y-1.5">
                      {structure.map((block, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-ink-100 bg-ink-25 px-3 py-2"
                        >
                          <span className="mr-2 text-[11px] font-bold tracking-wide text-brand-700">
                            {block.label}
                          </span>
                          <span className="text-[13px] leading-relaxed text-ink-700">
                            {block.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AnalysisBlock>
                ) : null}

                <AnalysisRow label="⑤ HOOK" value={analysis.hook} />

                {analysis.keywords.length > 0 ? (
                  <AnalysisBlock label="⑥ キーワード">
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </AnalysisBlock>
                ) : null}

                {analysis.emotions.length > 0 ? (
                  <AnalysisBlock label="⑦ 感情">
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.emotions.map((e) => (
                        <span
                          key={e}
                          className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </AnalysisBlock>
                ) : null}

                {specificity ? (
                  <AnalysisBlock label="⑧ 具体性">
                    <div className="space-y-1 text-[13px] leading-relaxed text-ink-800">
                      {specificity.numbers.length > 0 ? (
                        <p>
                          <span className="text-ink-500">数字: </span>
                          {specificity.numbers.join("、")}
                        </p>
                      ) : null}
                      {specificity.examples.length > 0 ? (
                        <p>
                          <span className="text-ink-500">実例: </span>
                          {specificity.examples.join("、")}
                        </p>
                      ) : null}
                      {specificity.properNouns.length > 0 ? (
                        <p>
                          <span className="text-ink-500">固有名詞: </span>
                          {specificity.properNouns.join("、")}
                        </p>
                      ) : null}
                      <p>
                        <span className="text-ink-500">ストーリー性: </span>
                        {specificity.hasStory ? "あり" : "なし"}
                      </p>
                    </div>
                  </AnalysisBlock>
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
              <CardHeader
                title="AI分析カード"
                description="まだ分析していません。「AIで分析する」を押すと、テーマ・ターゲット・構成・HOOK・キーワード・感情・CTA・反応理由の10項目を分析します。"
              />
              <DataNote>
                メトリクスと外れ値スコアは実測値（DATA）、分析結果はAI推定（HYPOTHESIS）として区別して表示されます。
              </DataNote>
            </Card>
          )}
        </div>

        {/* 3段目: 次にやること */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="次にやること"
              description="分析して型を掴んでから、自分の投稿に転用します。"
            />
            <div className="space-y-3">
              <AnalyzeButton postId={post.id} analyzed={Boolean(analysis)} />
              <NextActionButton href={`/generate?source=${post.id}`}>
                この型で作る（3案生成）
              </NextActionButton>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="MODEL LIBRARY"
              action={
                saved ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    保存済み
                  </span>
                ) : null
              }
            />

            {saved ? (
              <div className="space-y-3">
                {saved.categoryTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {saved.categoryTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {saved.memo ? (
                  <p className="border-l-2 border-ink-200 pl-2.5 text-xs leading-relaxed text-ink-500">
                    {saved.memo}
                  </p>
                ) : null}
                <form action={removeFromLibraryAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-500 shadow-xs transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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

/** 分析カードの1項目。ラベル列と内容列を分けて縦に走査しやすくする */
function AnalysisBlock({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold leading-relaxed tracking-[0.06em] text-ink-500 sm:mb-0">
        {label}
        {badge}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
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
    <AnalysisBlock label={label}>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
        {value}
      </p>
    </AnalysisBlock>
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
    <div className="rounded-lg border border-ink-100 bg-ink-25 px-2.5 py-1.5">
      <span className="mr-1.5 text-[11px] font-semibold text-ink-500">
        {label}
      </span>
      <span className="text-xs leading-relaxed text-ink-800">{value}</span>
    </div>
  );
}
