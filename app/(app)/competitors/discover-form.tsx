"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  addCompetitorAction,
  discoverAction,
  type AddState,
  type DiscoverState,
} from "./actions";
import { FormError, FormSuccess } from "@/components/form";
import { Card, formatNumber } from "@/components/ui";
import type { DiscoveredCompetitor } from "@/lib/competitors/service";

const initialState: DiscoverState = {
  error: null,
  genre: null,
  candidates: null,
};

export function DiscoverForm() {
  const [state, formAction] = useActionState(discoverAction, initialState);

  return (
    <div className="space-y-6">
      <Card>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">
              ジャンル・キーワード
            </span>
            <input
              name="genre"
              required
              placeholder="例：AI 業務改善"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <DiscoverSubmit />
        </form>
        <p className="mt-2 text-xs text-ink-400">
          探索はキーワード検索（最大10件）です。フォロワーリストの全取得はAPIコストが高いため行いません。
        </p>
        <div className="mt-2">
          <FormError message={state.error} />
        </div>
      </Card>

      {state.candidates ? (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-ink-900">
            発見した候補 — COMPETITOR SCORE 順
          </h2>
          <p className="mb-4 text-xs text-ink-500">
            スコアと理由はAIによる推定です。プロフィールを確認して追加してください。
          </p>
          <ul className="divide-y divide-ink-100">
            {state.candidates.map((candidate) => (
              <CandidateRow
                key={candidate.xUserId}
                candidate={candidate}
                genre={state.genre ?? ""}
              />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function CandidateRow({
  candidate,
  genre,
}: {
  candidate: DiscoveredCompetitor;
  genre: string;
}) {
  const [state, formAction] = useActionState(addCompetitorAction, {
    error: null,
    success: null,
  } satisfies AddState);

  const scoreTone =
    candidate.score >= 75
      ? "bg-emerald-100 text-emerald-800"
      : candidate.score >= 50
        ? "bg-amber-100 text-amber-800"
        : "bg-ink-100 text-ink-600";

  return (
    <li className="flex flex-wrap items-start gap-4 py-4">
      <span
        className={`mt-0.5 shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${scoreTone}`}
        title="COMPETITOR SCORE (AI推定)"
      >
        {candidate.score}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">
          {candidate.displayName}
          <span className="ml-1.5 font-normal text-ink-400">
            @{candidate.handle}
          </span>
          <span className="ml-2 text-xs font-normal text-ink-500">
            フォロワー {formatNumber(candidate.followers)}
          </span>
        </p>
        {candidate.profile ? (
          <p className="mt-0.5 text-xs text-ink-600">{candidate.profile}</p>
        ) : null}
        {candidate.reasons.length > 0 ? (
          <p className="mt-1 text-xs text-violet-700">
            <span className="mr-1 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-bold">
              AI推定
            </span>
            {candidate.reasons.join(" / ")}
          </p>
        ) : null}
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>

      <div className="shrink-0">
        {candidate.alreadyRegistered || state.success ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            登録済み
          </span>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="genre" value={genre} />
            <input type="hidden" name="xUserId" value={candidate.xUserId} />
            <input type="hidden" name="handle" value={candidate.handle} />
            <input
              type="hidden"
              name="displayName"
              value={candidate.displayName}
            />
            <input type="hidden" name="profile" value={candidate.profile ?? ""} />
            <input type="hidden" name="url" value={candidate.url ?? ""} />
            <input type="hidden" name="followers" value={candidate.followers} />
            <input type="hidden" name="following" value={candidate.following} />
            <input type="hidden" name="postsCount" value={candidate.postsCount} />
            <AddSubmit />
          </form>
        )}
      </div>
    </li>
  );
}

function DiscoverSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "探索中...（数十秒かかることがあります）" : "競合を探す"}
    </button>
  );
}

function AddSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "追加中..." : "ベンチマークに追加"}
    </button>
  );
}
