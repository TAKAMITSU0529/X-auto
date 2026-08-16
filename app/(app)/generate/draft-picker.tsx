"use client";

import { useActionState, useState } from "react";
import type { DraftWithSimilarity } from "@/lib/generation/service";
import type { DraftScore } from "@/lib/ai";
import type { PersonallyAdjustedScore } from "@/lib/generation/personal-model";

type ScoreLike = DraftScore & Partial<PersonallyAdjustedScore>;
import { selectDraftAction, type SelectState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import {
  HypothesisNote,
  MeterBar,
  NextActionButton,
  Tag,
} from "@/components/ui";

const initialState: SelectState = { error: null, success: null };

/**
 * 3案の表示・選択・編集・下書き保存 (F-06)。
 * 類似度チェックの結果 (F-05) は案ごとにバッジで表示する。
 */
export function DraftPicker({
  generatedPostId,
  drafts,
  predictedScores,
  alreadySaved,
  savedIndex,
}: {
  generatedPostId: string;
  drafts: DraftWithSimilarity[];
  predictedScores: ScoreLike[] | null;
  alreadySaved: boolean;
  savedIndex: number | null;
}) {
  const [selected, setSelected] = useState<number>(savedIndex ?? 0);
  const [editedText, setEditedText] = useState<string>(
    drafts[savedIndex ?? 0]?.text ?? "",
  );
  const [state, formAction] = useActionState(selectDraftAction, initialState);

  const choose = (index: number) => {
    setSelected(index);
    setEditedText(drafts[index]?.text ?? "");
  };

  const selectedScore = predictedScores?.[selected];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {drafts.map((draft, index) => {
          const score = predictedScores?.[index];
          const isSelected = selected === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => choose(index)}
              aria-pressed={isSelected}
              className={`flex flex-col rounded-card border p-4 text-left transition duration-200 ${
                isSelected
                  ? "border-brand-500 bg-brand-50/60 shadow-card"
                  : "border-ink-200/70 bg-white shadow-xs hover:border-ink-300 hover:shadow-sm"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                  {draft.label}
                  {isSelected ? <Tag tone="brand">選択中</Tag> : null}
                </span>
                <SimilarityBadge similarity={draft.similarity} />
              </div>

              {score ? (
                <div
                  className="mb-3"
                  title={`AI予測反応スコア (保証ではありません)\n${formatAxes(score)}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">
                      <Tag tone="hypothesis">AI予測</Tag>
                      反応スコア
                    </span>
                    <span className="text-[18px] font-bold leading-none tabular-nums text-violet-900">
                      {score.total}
                      <span className="ml-0.5 text-[11px] font-semibold text-violet-500">
                        /100
                      </span>
                    </span>
                  </div>
                  <MeterBar
                    ratio={score.total / 100}
                    tone={isSelected ? "brand" : "ink"}
                    className="mt-1.5"
                  />
                  {score.personalAdjustment?.applied ? (
                    <p
                      className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
                      title={score.personalAdjustment.reasons.join("\n")}
                    >
                      <Tag tone="data">DATA</Tag>
                      あなたの実績で +{score.personalAdjustment.delta}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="mb-3 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                {draft.text}
              </p>

              <div className="space-y-1.5 border-t border-ink-100 pt-2.5 text-xs leading-relaxed text-ink-500">
                <p>
                  <span className="font-semibold text-ink-700">狙い: </span>
                  {draft.intent}
                </p>
                <p>
                  <span className="font-semibold text-ink-700">想定反応: </span>
                  {draft.expectedReaction}
                  <span className="ml-1.5 inline-flex align-middle">
                    <Tag tone="hypothesis">AI推定</Tag>
                  </span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {predictedScores ? (
        <AxisComparison
          drafts={drafts}
          scores={predictedScores}
          selected={selected}
          onSelect={choose}
        />
      ) : null}

      {selectedScore ? (
        <div className="space-y-2">
          <HypothesisNote>
            {selectedScore.comment}
            <span className="mt-1 block text-xs text-violet-700">
              {formatAxes(selectedScore)}
            </span>
          </HypothesisNote>

          {selectedScore.personalAdjustment?.applied ? (
            <div className="flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
              <Tag tone="data">DATA</Tag>
              <div className="text-[13px] leading-relaxed text-emerald-900">
                <p>
                  Personal Growth Model: あなたの投稿実績
                  <span className="tabular-nums">
                    {selectedScore.personalAdjustment.sampleSize}
                  </span>
                  件に基づく補正 (基礎
                  <span className="tabular-nums">
                    {selectedScore.baseTotal}
                  </span>
                  点 →{" "}
                  <span className="font-semibold tabular-nums">
                    {selectedScore.total}
                  </span>
                  点)。
                </p>
                <ul className="mt-1.5 space-y-1">
                  {selectedScore.personalAdjustment.reasons.map((reason, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-500"
                      />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {drafts[selected]?.similarity?.message ? (
        <p
          className={`rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${
            drafts[selected].similarity.level === "warning"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {drafts[selected].similarity.message}
        </p>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="generatedPostId" value={generatedPostId} />
        <input type="hidden" name="selectedIndex" value={selected} />

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            選択した案（編集できます）
          </span>
          <textarea
            name="editedText"
            rows={7}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full resize-y rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink-900 shadow-xs outline-none transition duration-200 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
          <span className="mt-1.5 block text-right text-xs tabular-nums text-ink-400">
            {editedText.length} 文字
          </span>
        </label>

        <FormError message={state.error} />
        <FormSuccess message={state.success} />

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton fullWidth={false} pendingLabel="保存中...">
            {alreadySaved ? "選択し直して保存する" : "この案を下書き保存"}
          </SubmitButton>
          {state.success ? (
            <NextActionButton href="/schedule">
              予約投稿で日時を指定する
            </NextActionButton>
          ) : null}
        </div>
      </form>
    </div>
  );
}

const AXIS_LABELS: Record<string, string> = {
  hook: "フック",
  relevance: "関連性",
  specificity: "具体性",
  novelty: "新規性",
  credibility: "信頼性",
  emotion: "感情",
  readability: "読みやすさ",
  shareability: "拡散性",
  cta: "CTA",
  brandFit: "ブランド適合",
};

const AXIS_KEYS = Object.keys(AXIS_LABELS) as (keyof DraftScore["axes"])[];

/**
 * 予測スコア10軸の3案横並び比較。
 * 軸ごとに最も高い案を brand 色で示し、どの案がどこで勝っているかを一目で追える。
 */
function AxisComparison({
  drafts,
  scores,
  selected,
  onSelect,
}: {
  drafts: DraftWithSimilarity[];
  scores: ScoreLike[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="rounded-card border border-violet-200/80 bg-violet-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">
          <Tag tone="hypothesis">AI推定</Tag>
          予測スコアの10軸比較（各0〜10点）
        </p>
        <p className="text-[11px] text-violet-700">
          軸ごとの最高点を濃い色で示しています。保証ではありません
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr>
              <th className="w-24 pb-2 text-left text-[11px] font-medium text-ink-500">
                軸
              </th>
              {drafts.map((draft, index) => (
                <th key={index} className="pb-2 pl-3 text-left">
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    className={`flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-left transition duration-200 ${
                      selected === index
                        ? "bg-white text-brand-700 shadow-xs"
                        : "text-ink-600 hover:bg-white/70"
                    }`}
                  >
                    <span className="truncate text-[11px] font-semibold">
                      {draft.label}
                    </span>
                    <span className="text-[13px] font-bold tabular-nums">
                      {scores[index]?.total ?? "—"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-200/60">
            {AXIS_KEYS.map((key) => {
              const values = drafts.map((_, i) => scores[i]?.axes[key] ?? 0);
              const max = Math.max(...values);
              return (
                <tr key={key}>
                  <th
                    scope="row"
                    className="py-1.5 pr-2 text-left text-xs font-medium text-ink-600"
                  >
                    {AXIS_LABELS[key]}
                  </th>
                  {drafts.map((_, index) => {
                    const value = values[index];
                    const isTop = value === max && max > 0;
                    return (
                      <td key={index} className="py-1.5 pl-3">
                        <div className="flex items-center gap-2">
                          <MeterBar
                            ratio={value / 10}
                            tone={isTop ? "brand" : "ink"}
                            className="flex-1"
                          />
                          <span
                            className={`w-5 shrink-0 text-right text-xs tabular-nums ${
                              isTop
                                ? "font-bold text-brand-700"
                                : "text-ink-500"
                            }`}
                          >
                            {value}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAxes(score: DraftScore): string {
  const entries = Object.entries(score.axes) as [string, number][];
  const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const bottom = [...entries].sort((a, b) => a[1] - b[1]).slice(0, 1);
  return `強み: ${top.map(([k, v]) => `${AXIS_LABELS[k] ?? k}${v}`).join("・")} / 弱み: ${bottom.map(([k, v]) => `${AXIS_LABELS[k] ?? k}${v}`).join("")}`;
}

function SimilarityBadge({
  similarity,
}: {
  similarity: DraftWithSimilarity["similarity"];
}) {
  if (!similarity) return null;

  if (similarity.level === "warning") {
    return (
      <span className="inline-flex h-[18px] shrink-0 items-center rounded px-1.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ring-rose-200 bg-rose-100 text-rose-700">
        元投稿と酷似
      </span>
    );
  }
  if (similarity.level === "caution") {
    return (
      <span className="inline-flex h-[18px] shrink-0 items-center rounded px-1.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ring-amber-200 bg-amber-100 text-amber-800">
        表現やや近い
      </span>
    );
  }
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center rounded px-1.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ring-emerald-200 bg-emerald-100 text-emerald-700">
      類似度OK
    </span>
  );
}
