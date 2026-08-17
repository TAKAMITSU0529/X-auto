"use client";

import { useActionState } from "react";
import { positioningAction, type PositioningState } from "./actions";
import { Field, FormError, SubmitButton } from "@/components/form";
import {
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  MeterBar,
  NextActionButton,
  Tag,
} from "@/components/ui";

const initialState: PositioningState = {
  error: null,
  genre: null,
  result: null,
  competitorCount: 0,
};

export function PositioningForm() {
  const [state, formAction] = useActionState(positioningAction, initialState);
  const result = state.result;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="ジャンルを指定して分析する"
          description="登録済みの競合の公開プロフィールを分析対象にします。ジャンルは競合と読者を絞り込むために使われます。"
        />
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field
              label="ジャンル"
              name="genre"
              required
              placeholder="例：AI業務改善"
            />
          </div>
          <div className="shrink-0">
            <SubmitButton
              fullWidth={false}
              pendingLabel="分析中...（数十秒かかることがあります）"
            >
              ポジショニングを分析
            </SubmitButton>
          </div>
        </form>
        {state.error ? (
          <div className="mt-3">
            <FormError message={state.error} />
          </div>
        ) : null}
      </Card>

      {result ? (
        <>
          <HypothesisNote>
            以下はすべてAIによるマーケティング仮説です（分析対象: 登録済み競合{" "}
            {state.competitorCount} アカウントの公開プロフィール）。
          </HypothesisNote>

          {/* COMPETITOR MAP */}
          <Card>
            <CardHeader
              title="COMPETITOR MAP"
              description={`横軸: ${result.axes.x.label}（${result.axes.x.low} ←→ ${result.axes.x.high}） / 縦軸: ${result.axes.y.label}（${result.axes.y.low} ←→ ${result.axes.y.high}）`}
              action={
                <NextActionButton href="/strategy">
                  この立ち位置で戦略を設計する
                </NextActionButton>
              }
            />

            {/* 凡例 (色だけに頼らずラベルでも区別する) */}
            <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-400" />
                登録済みの競合
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-brand-600 shadow-xs" />
                あなたの推奨ポジション
              </span>
              <Tag tone="hypothesis">AI推定</Tag>
            </div>

            <div className="mx-auto max-w-2xl">
              <div className="relative aspect-square w-full rounded-card border border-ink-200 bg-ink-25">
                {/* 4分割の補助線 */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <span className="border-b border-r border-dashed border-ink-200" />
                  <span className="border-b border-dashed border-ink-200" />
                  <span className="border-r border-dashed border-ink-200" />
                  <span />
                </div>

                {/* 軸 */}
                <div className="absolute left-0 top-1/2 h-px w-full bg-ink-300" />
                <div className="absolute left-1/2 top-0 h-full w-px bg-ink-300" />

                {/* 軸ラベル */}
                <span className="absolute left-2 top-1/2 -translate-y-4 rounded bg-ink-25/90 px-1 text-[10px] font-medium text-ink-500">
                  {result.axes.x.low}
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-4 rounded bg-ink-25/90 px-1 text-[10px] font-medium text-ink-500">
                  {result.axes.x.high}
                </span>
                <span className="absolute left-1/2 top-2 ml-1.5 rounded bg-ink-25/90 px-1 text-[10px] font-medium text-ink-500">
                  {result.axes.y.high}
                </span>
                <span className="absolute bottom-2 left-1/2 ml-1.5 rounded bg-ink-25/90 px-1 text-[10px] font-medium text-ink-500">
                  {result.axes.y.low}
                </span>

                {/* 競合 */}
                {result.placements.map((p) => (
                  <div
                    key={p.handle}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{
                      left: `${50 + clamp(p.x) * 44}%`,
                      top: `${50 - clamp(p.y) * 44}%`,
                    }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-ink-400 ring-2 ring-white" />
                    <span className="mt-1 max-w-28 truncate rounded bg-white/85 px-1 text-[10px] leading-tight text-ink-600">
                      @{p.handle}
                    </span>
                  </div>
                ))}

                {/* 推奨ポジション */}
                <div
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{
                    left: `${50 + clamp(result.recommendedPosition.x) * 44}%`,
                    top: `${50 - clamp(result.recommendedPosition.y) * 44}%`,
                  }}
                >
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-brand-600 shadow-md" />
                  <span className="mt-1 whitespace-nowrap rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    あなた: {result.recommendedPosition.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <HypothesisNote>{result.recommendation}</HypothesisNote>
            </div>
          </Card>

          {/* POSITIONING SCORE */}
          <Card>
            <CardHeader
              title="POSITIONING SCORE — 候補の採点"
              description="競合密度・需要・差別化・実績・専門性・マネタイズ・継続性の観点をAIが総合したスコアです。"
            />
            <ul className="space-y-3">
              {result.candidates
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((candidate) => (
                  <li
                    key={candidate.name}
                    className="rounded-xl border border-ink-200 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border text-[15px] font-bold tabular-nums ${
                          candidate.score >= 75
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : candidate.score >= 55
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-ink-200 bg-ink-50 text-ink-600"
                        }`}
                      >
                        {candidate.score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink-900">
                          {candidate.name}
                        </p>
                        <MeterBar
                          className="mt-2"
                          ratio={candidate.score / 100}
                          tone={
                            candidate.score >= 75
                              ? "emerald"
                              : candidate.score >= 55
                                ? "amber"
                                : "ink"
                          }
                        />
                        <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs leading-relaxed text-ink-600">
                          {candidate.reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>

          {/* PROFILE GENERATOR */}
          <Card>
            <CardHeader
              title="プロフィール3案"
              description="推奨ポジションに基づく名前欄・bio・固定ポスト・ヘッダーコピー。コピーしてXのプロフィールに貼り付けてください。"
              action={
                <NextActionButton href="/brand">
                  MY BRAND に反映する
                </NextActionButton>
              }
            />
            <div className="grid gap-4 lg:grid-cols-3 items-start">
              {result.profiles.map((profile) => (
                <div
                  key={profile.title}
                  className="flex flex-col rounded-xl border border-ink-200 bg-ink-25 p-4"
                >
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold text-brand-700">
                    {profile.title}
                    <Tag tone="hypothesis">AI推定</Tag>
                  </p>
                  <ProfileField label="名前欄" value={profile.name} />
                  <ProfileField label="bio" value={profile.bio} />
                  <ProfileField label="固定ポスト案" value={profile.pinnedPost} />
                  <ProfileField
                    label="ヘッダーコピー"
                    value={profile.headerCopy}
                  />
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          title="まだ分析していません"
          description="ジャンルを入力して「ポジショニングを分析」を押すと、登録済み競合を2軸にマッピングし、空いている立ち位置とプロフィール3案を提案します。競合がまだ少ない場合は、先に競合発見で候補を追加してください。"
        />
      )}
    </div>
  );
}

function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
        {label}
      </p>
      <p className="whitespace-pre-wrap rounded-lg border border-ink-100 bg-white px-2.5 py-2 text-xs leading-relaxed text-ink-800">
        {value}
      </p>
    </div>
  );
}
