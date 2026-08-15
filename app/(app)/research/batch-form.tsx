"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { batchAnalyzeAction, type BatchState } from "./actions";
import { FormError } from "@/components/form";

const initialState: BatchState = {
  error: null,
  result: null,
  analyzedCount: 0,
  savedPatterns: 0,
};

/**
 * 外れ値上位の一括分析 (F-04) → 勝ちパターン抽出 (F-16)。
 * 結果は §9 に従い AI推定 として表示する。
 */
export function BatchAnalyzeForm({ accountId }: { accountId: string }) {
  const [state, formAction] = useActionState(batchAnalyzeAction, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex items-center gap-3">
        <input type="hidden" name="accountId" value={accountId} />
        <BatchSubmit />
        <span className="text-xs text-ink-400">
          外れ値上位20件をAIで横断分析し、勝ちパターンをライブラリに保存します
        </span>
      </form>

      <FormError message={state.error} />

      {state.result ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-800">
              AI推定
            </span>
            <span className="text-xs text-violet-700">
              {state.analyzedCount}件を分析 · 勝ちパターン{state.savedPatterns}
              件をライブラリに保存しました
            </span>
          </div>

          <p className="mb-3 text-sm leading-relaxed text-violet-900">
            {state.result.summary}
          </p>

          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <BatchRow label="共通構造" items={state.result.commonStructures} />
            <BatchRow label="共通HOOK" items={state.result.commonHooks} />
            <BatchRow label="頻出テーマ" items={state.result.frequentThemes} />
            <BatchRow label="感情" items={state.result.emotions} />
            <BatchRow label="CTA" items={state.result.ctas} />
            <BatchRow label="投稿形式" items={state.result.formats} />
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-violet-800">
              抽出された勝ちパターン
            </p>
            {state.result.winningPatterns.map((pattern) => (
              <div
                key={pattern.name}
                className="rounded-lg border border-violet-200 bg-white px-3 py-2"
              >
                <p className="text-sm font-semibold text-ink-900">
                  {pattern.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  {pattern.description}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {pattern.steps.join(" → ")}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <Link
              href="/library"
              className="inline-flex rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              ライブラリでパターンを使う
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BatchRow({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <span className="font-semibold text-violet-800">{label}: </span>
      <span className="text-violet-900">{items.join(" / ")}</span>
    </div>
  );
}

function BatchSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-lg border border-violet-300 bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "分析中...（数十秒かかることがあります）" : "勝ちパターンを抽出"}
    </button>
  );
}
