"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { DraftWithSimilarity } from "@/lib/generation/service";
import { selectDraftAction, type SelectState } from "./actions";
import { FormError, FormSuccess } from "@/components/form";

const initialState: SelectState = { error: null, success: null };

/**
 * 3案の表示・選択・編集・下書き保存 (F-06)。
 * 類似度チェックの結果 (F-05) は案ごとにバッジで表示する。
 */
export function DraftPicker({
  generatedPostId,
  drafts,
  alreadySaved,
  savedIndex,
}: {
  generatedPostId: string;
  drafts: DraftWithSimilarity[];
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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {drafts.map((draft, index) => (
          <button
            key={index}
            type="button"
            onClick={() => choose(index)}
            className={`flex flex-col rounded-xl border p-4 text-left transition ${
              selected === index
                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                : "border-ink-200 bg-white hover:border-ink-300"
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-ink-900">
                {draft.label}
              </span>
              <SimilarityBadge similarity={draft.similarity} />
            </div>

            <p className="mb-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
              {draft.text}
            </p>

            <div className="space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-500">
              <p>
                <span className="font-semibold">狙い:</span> {draft.intent}
              </p>
              <p>
                <span className="font-semibold">想定反応:</span>{" "}
                {draft.expectedReaction}
                <span className="ml-1 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-bold text-violet-700">
                  AI推定
                </span>
              </p>
            </div>
          </button>
        ))}
      </div>

      {drafts[selected]?.similarity?.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            drafts[selected].similarity.level === "warning"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {drafts[selected].similarity.message}
        </p>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="generatedPostId" value={generatedPostId} />
        <input type="hidden" name="selectedIndex" value={selected} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            選択した案（編集できます）
          </span>
          <textarea
            name="editedText"
            rows={7}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <span className="mt-1 block text-right text-xs text-ink-400">
            {editedText.length} 文字
          </span>
        </label>

        <FormError message={state.error} />
        <FormSuccess message={state.success} />

        <SaveButton alreadySaved={alreadySaved} />
      </form>
    </div>
  );
}

function SimilarityBadge({
  similarity,
}: {
  similarity: DraftWithSimilarity["similarity"];
}) {
  if (!similarity) return null;

  if (similarity.level === "warning") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
        元投稿と酷似
      </span>
    );
  }
  if (similarity.level === "caution") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        表現やや近い
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
      類似度OK
    </span>
  );
}

function SaveButton({ alreadySaved }: { alreadySaved: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "保存中..."
        : alreadySaved
          ? "選択し直して保存する"
          : "この案を下書き保存"}
    </button>
  );
}
