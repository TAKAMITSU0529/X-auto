"use client";

import { useActionState } from "react";
import { batchAnalyzeAction, type BatchState } from "./actions";
import { FormError, SubmitButton } from "@/components/form";
import { HypothesisNote, NextActionButton, Tag } from "@/components/ui";

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
      <form action={formAction}>
        <input type="hidden" name="accountId" value={accountId} />
        <SubmitButton
          fullWidth={false}
          pendingLabel="分析中...（数十秒かかることがあります）"
        >
          勝ちパターンを抽出
        </SubmitButton>
      </form>

      <FormError message={state.error} />

      {state.result ? (
        <div className="space-y-4">
          <HypothesisNote>{state.result.summary}</HypothesisNote>

          <p className="text-xs tabular-nums text-ink-500">
            {state.analyzedCount}件を分析 · 勝ちパターン{state.savedPatterns}
            件をライブラリに保存しました
          </p>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              共通項
              <Tag tone="hypothesis">AI推定</Tag>
            </p>
            <dl className="grid items-start gap-x-6 gap-y-2 border-y border-ink-100 py-3.5 sm:grid-cols-2">
              <BatchRow label="共通構造" items={state.result.commonStructures} />
              <BatchRow label="共通HOOK" items={state.result.commonHooks} />
              <BatchRow label="頻出テーマ" items={state.result.frequentThemes} />
              <BatchRow label="感情" items={state.result.emotions} />
              <BatchRow label="CTA" items={state.result.ctas} />
              <BatchRow label="投稿形式" items={state.result.formats} />
            </dl>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              抽出された勝ちパターン
              <Tag tone="hypothesis">AI推定</Tag>
            </p>
            {state.result.winningPatterns.map((pattern) => (
              <div
                key={pattern.name}
                className="rounded-lg border border-ink-200 bg-ink-25 px-3.5 py-2.5 shadow-xs"
              >
                <p className="text-[13px] font-semibold text-ink-900">
                  {pattern.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                  {pattern.description}
                </p>
                <p className="mt-1.5 text-xs text-ink-400">
                  {pattern.steps.join(" → ")}
                </p>
              </div>
            ))}
          </div>

          <NextActionButton href="/library">
            ライブラリでパターンを使う
          </NextActionButton>
        </div>
      ) : null}
    </div>
  );
}

function BatchRow({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <dt className="shrink-0 font-semibold text-ink-500">{label}</dt>
      <dd className="text-ink-800">{items.join(" / ")}</dd>
    </div>
  );
}
