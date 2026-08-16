"use client";

import { useActionState } from "react";
import { funnelAction, type FunnelState } from "./actions";
import { FormError, SubmitButton } from "@/components/form";
import {
  ActionNote,
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  LinkButton,
  NextActionButton,
  Tag,
} from "@/components/ui";
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
      <Card>
        <CardHeader
          title="競合のマネタイズ動線を分析する"
          description="登録済みのベンチマーク（フォロワー上位8アカウントまで）の公開情報 — プロフィール・プロフィールURL・取得済み投稿の誘導文 — から収益導線を分析します。外部サイトのクロールは行わず、DB内のデータのみを使うため追加のX APIコストは掛かりません。"
        />
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <SubmitButton
            fullWidth={false}
            pendingLabel="分析中...（数十秒かかることがあります）"
          >
            動線を分析する
          </SubmitButton>
          {state.result ? (
            <span className="text-xs tabular-nums text-ink-500">
              {state.competitorCount}アカウントを分析しました
            </span>
          ) : null}
        </form>
        {state.error ? (
          <div className="mt-3">
            <FormError message={state.error} />
          </div>
        ) : null}
      </Card>

      {state.result ? (
        <FunnelResult result={state.result} />
      ) : (
        <EmptyState
          title="まだ分析していません"
          description="「動線を分析する」を押すと、登録済みベンチマークの公開情報から収益導線をFUNNEL MAPにまとめます。ベンチマークがまだ無い場合は、先に競合を登録してください。"
          action={
            <LinkButton href="/benchmarks" variant="secondary" size="sm">
              ベンチマークを確認する
            </LinkButton>
          }
        />
      )}
    </div>
  );
}

/** 根拠の区分 (§9): 公開情報から確認できた事実か、AIの推定か */
function BasisBadge({ basis }: { basis: "confirmed" | "estimated" }) {
  return basis === "confirmed" ? (
    <Tag tone="data">確認済み</Tag>
  ) : (
    <Tag tone="hypothesis">推定</Tag>
  );
}

function FunnelResult({
  result,
}: {
  result: NonNullable<FunnelState["result"]>;
}) {
  return (
    <div className="space-y-6">
      <HypothesisNote>
        「確認済み」は公開情報（bio・URL・投稿）から確認できた事実、「推定」はAIによる仮説です。収益額・成約率などの非公開情報は推測していません。
      </HypothesisNote>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {result.competitors.map((c) => (
          <CompetitorCard key={c.handle} competitor={c} />
        ))}
      </div>

      <Card>
        <CardHeader
          title="自分が転用するならこの動線（AI推定）"
          action={
            <NextActionButton href="/strategy">
              マーケティング戦略へ
            </NextActionButton>
          }
        />

        {/* 転用する動線のステップ */}
        <ol className="flex flex-wrap items-center gap-1.5">
          {result.adaptation.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-25 px-2.5 py-1.5 text-xs font-medium text-ink-800 shadow-xs">
                <span className="text-[10px] font-bold tabular-nums text-ink-400">
                  {i + 1}
                </span>
                {step}
              </span>
              {i < result.adaptation.steps.length - 1 ? (
                <span aria-hidden="true" className="text-ink-300">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-4 space-y-2">
          <HypothesisNote>{result.adaptation.reason}</HypothesisNote>
          <ActionNote>
            この動線を採用する場合は、マーケティング戦略（HOW
            の動線設計）に転記してください。投稿生成が参照するようになります。
          </ActionNote>
        </div>
      </Card>
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: CompetitorFunnel }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink-900">
          @{competitor.handle}
        </p>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
          {competitor.monetizationType}
        </span>
      </div>

      {/* FUNNEL MAP: 認知 → … → 商品 の導線を縦の流れ図として読ませる */}
      <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        FUNNEL MAP
      </p>
      <ol className="rounded-xl border border-ink-100 bg-ink-25 p-3">
        {competitor.funnelSteps.map((step, i) => {
          const last = i === competitor.funnelSteps.length - 1;
          return (
            <li
              key={`${step.label}-${i}`}
              className={`relative flex items-start gap-3 ${last ? "" : "pb-3"}`}
            >
              {!last ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[11px] top-6 w-px bg-ink-200"
                />
              ) : null}
              <span
                className={`relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums ${
                  step.basis === "confirmed"
                    ? "border-ink-300 bg-white text-ink-600"
                    : "border-violet-200 bg-white text-violet-700"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`inline-flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${
                  step.basis === "confirmed"
                    ? "border-ink-200 bg-white text-ink-800"
                    : "border-violet-200 bg-violet-50 text-violet-800"
                }`}
              >
                {step.label}
                <BasisBadge basis={step.basis} />
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            <Tag tone="data">DATA</Tag>
            確認済み（公開情報）
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-[13px] leading-relaxed text-ink-700">
            {competitor.confirmedFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-600">
            <Tag tone="hypothesis">AI推定</Tag>
            AIによる推定
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-[13px] leading-relaxed text-violet-900">
            {competitor.estimated.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
