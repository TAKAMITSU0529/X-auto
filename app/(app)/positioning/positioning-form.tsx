"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { positioningAction, type PositioningState } from "./actions";
import { FormError } from "@/components/form";
import { Card, HypothesisNote } from "@/components/ui";

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
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">
              ジャンル
            </span>
            <input
              name="genre"
              required
              placeholder="例：AI業務改善"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <PositioningSubmit />
        </form>
        <div className="mt-2">
          <FormError message={state.error} />
        </div>
      </Card>

      {result ? (
        <>
          <HypothesisNote>
            以下はすべてAIによるマーケティング仮説です（分析対象: 登録済み競合{" "}
            {state.competitorCount} アカウントの公開プロフィール）。
          </HypothesisNote>

          {/* COMPETITOR MAP */}
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              COMPETITOR MAP
            </h2>
            <p className="mb-4 text-xs text-ink-500">
              横軸: {result.axes.x.label}（{result.axes.x.low} ←→{" "}
              {result.axes.x.high}） / 縦軸: {result.axes.y.label}（
              {result.axes.y.low} ←→ {result.axes.y.high}）
            </p>

            <div className="relative mx-auto h-96 max-w-2xl rounded-xl border border-ink-200 bg-ink-50">
              {/* 軸 */}
              <div className="absolute left-0 top-1/2 h-px w-full bg-ink-300" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-ink-300" />
              <span className="absolute left-2 top-1/2 -translate-y-5 text-[10px] text-ink-400">
                {result.axes.x.low}
              </span>
              <span className="absolute right-2 top-1/2 -translate-y-5 text-[10px] text-ink-400">
                {result.axes.x.high}
              </span>
              <span className="absolute left-1/2 top-2 ml-1 text-[10px] text-ink-400">
                {result.axes.y.high}
              </span>
              <span className="absolute bottom-2 left-1/2 ml-1 text-[10px] text-ink-400">
                {result.axes.y.low}
              </span>

              {/* 競合 */}
              {result.placements.map((p) => (
                <div
                  key={p.handle}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${50 + clamp(p.x) * 44}%`,
                    top: `${50 - clamp(p.y) * 44}%`,
                  }}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-ink-400" />
                  <span className="mt-0.5 block max-w-24 truncate text-[10px] text-ink-500">
                    @{p.handle}
                  </span>
                </div>
              ))}

              {/* 推奨ポジション */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${50 + clamp(result.recommendedPosition.x) * 44}%`,
                  top: `${50 - clamp(result.recommendedPosition.y) * 44}%`,
                }}
              >
                <div className="h-4 w-4 animate-pulse rounded-full border-2 border-white bg-brand-600 shadow" />
                <span className="mt-0.5 block whitespace-nowrap rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  あなた: {result.recommendedPosition.label}
                </span>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {result.recommendation}
            </p>
          </Card>

          {/* POSITIONING SCORE */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              POSITIONING SCORE — 候補の採点
            </h2>
            <ul className="space-y-3">
              {result.candidates
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((candidate) => (
                  <li
                    key={candidate.name}
                    className="flex items-start gap-3 rounded-lg border border-ink-200 p-3"
                  >
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                        candidate.score >= 75
                          ? "bg-emerald-100 text-emerald-800"
                          : candidate.score >= 55
                            ? "bg-amber-100 text-amber-800"
                            : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {candidate.score}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {candidate.name}
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-ink-600">
                        {candidate.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>

          {/* PROFILE GENERATOR */}
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              プロフィール3案
            </h2>
            <p className="mb-4 text-xs text-ink-500">
              推奨ポジションに基づく名前欄・bio・固定ポスト・ヘッダーコピー。コピーしてXのプロフィールに貼り付けてください。
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {result.profiles.map((profile) => (
                <div
                  key={profile.title}
                  className="flex flex-col rounded-xl border border-ink-200 p-4"
                >
                  <p className="mb-2 text-xs font-bold text-brand-700">
                    {profile.title}
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
      ) : null}
    </div>
  );
}

function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className="whitespace-pre-wrap rounded-lg bg-ink-50 px-2.5 py-2 text-xs leading-relaxed text-ink-800">
        {value}
      </p>
    </div>
  );
}

function PositioningSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "分析中...（数十秒かかることがあります）" : "ポジショニングを分析"}
    </button>
  );
}
