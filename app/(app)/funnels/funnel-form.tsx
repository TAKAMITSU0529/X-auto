"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { funnelAction, type FunnelState } from "./actions";
import { FormError } from "@/components/form";
import type { CompetitorFunnel } from "@/lib/ai/provider";

const initialState: FunnelState = {
  error: null,
  result: null,
  competitorCount: 0,
};

export function FunnelForm() {
  const [state, formAction] = useActionState(funnelAction, initialState);

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm"
      >
        <p className="text-sm text-ink-600">
          登録済みのベンチマーク（フォロワー上位8アカウントまで）の公開情報
          — プロフィール・プロフィールURL・取得済み投稿の誘導文 —
          から収益導線を分析します。外部サイトのクロールは行わず、DB内のデータのみを使うため追加のX
          APIコストは掛かりません。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <RunButton />
          {state.result ? (
            <span className="text-xs text-ink-500">
              {state.competitorCount}アカウントを分析しました
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <FormError message={state.error} />
        </div>
      </form>

      {state.result ? <FunnelResult result={state.result} /> : null}
    </div>
  );
}

function RunButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "分析中...（数十秒かかることがあります）" : "動線を分析する"}
    </button>
  );
}

function BasisBadge({ basis }: { basis: "confirmed" | "estimated" }) {
  return basis === "confirmed" ? (
    <span className="rounded bg-ink-200 px-1 py-0.5 text-[10px] font-bold text-ink-700">
      確認済み
    </span>
  ) : (
    <span className="rounded bg-violet-200 px-1 py-0.5 text-[10px] font-bold text-violet-800">
      推定
    </span>
  );
}

function FunnelResult({
  result,
}: {
  result: NonNullable<FunnelState["result"]>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
        <span className="mr-2 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-800">
          AI推定
        </span>
        「確認済み」は公開情報（bio・URL・投稿）から確認できた事実、「推定」はAIによる仮説です。収益額・成約率などの非公開情報は推測していません。
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.competitors.map((c) => (
          <CompetitorCard key={c.handle} competitor={c} />
        ))}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="text-sm font-semibold text-emerald-900">
          自分が転用するならこの動線（AI推定）
        </h3>
        <ol className="mt-3 flex flex-wrap items-center gap-1.5">
          {result.adaptation.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              <span className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900">
                {step}
              </span>
              {i < result.adaptation.steps.length - 1 ? (
                <span className="text-emerald-400">→</span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-emerald-800">
          {result.adaptation.reason}
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          この動線を採用する場合は、マーケティング戦略（HOW の動線設計）に転記してください。投稿生成が参照するようになります。
        </p>
      </div>
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: CompetitorFunnel }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink-900">@{competitor.handle}</p>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {competitor.monetizationType}
        </span>
      </div>

      {/* FUNNEL MAP */}
      <ol className="mt-3 flex flex-wrap items-center gap-1.5">
        {competitor.funnelSteps.map((step, i) => (
          <li key={`${step.label}-${i}`} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${
                step.basis === "confirmed"
                  ? "border-ink-300 bg-ink-50 text-ink-800"
                  : "border-violet-200 bg-violet-50 text-violet-800"
              }`}
            >
              {step.label}
              <BasisBadge basis={step.basis} />
            </span>
            {i < competitor.funnelSteps.length - 1 ? (
              <span className="text-ink-300">→</span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <p className="text-xs font-semibold text-ink-500">
            確認済み（公開情報）
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-ink-700">
            {competitor.confirmedFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-violet-600">AIによる推定</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-violet-900">
            {competitor.estimated.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
