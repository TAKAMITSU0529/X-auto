"use client";

import { useActionState } from "react";
import {
  addCompetitorAction,
  discoverAction,
  type AddState,
  type DiscoverState,
} from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/form";
import {
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  NextActionButton,
  Tag,
  formatNumber,
} from "@/components/ui";
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
        <CardHeader
          title="ジャンルから競合を探す"
          description="探索はキーワード検索（最大10件）です。フォロワーリストの全取得はAPIコストが高いため行いません。"
        />
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field
              label="ジャンル・キーワード"
              name="genre"
              required
              placeholder="例：AI 業務改善"
            />
          </div>
          <div className="shrink-0">
            <SubmitButton
              fullWidth={false}
              pendingLabel="探索中...（数十秒かかることがあります）"
            >
              競合を探す
            </SubmitButton>
          </div>
        </form>
        {state.error ? (
          <div className="mt-3">
            <FormError message={state.error} />
          </div>
        ) : null}
      </Card>

      {state.candidates === null ? (
        <EmptyState
          title="まだ探索していません"
          description="上のフォームにジャンルのキーワードを入れて「競合を探す」を押してください。同ジャンルの発信者をAIが COMPETITOR SCORE で採点し、良い候補をそのままベンチマークに追加できます。"
        />
      ) : state.candidates.length === 0 ? (
        <EmptyState
          title="候補が見つかりませんでした"
          description="キーワードを変えてもう一度探索してください。「AI 業務改善」のように、ジャンルと読者の課題を組み合わせると候補が見つかりやすくなります。"
        />
      ) : (
        <Card>
          <CardHeader
            title="発見した候補 — COMPETITOR SCORE 順"
            action={
              <NextActionButton href="/benchmarks">
                ベンチマーク一覧へ
              </NextActionButton>
            }
          />
          <HypothesisNote>
            スコアと理由はAIによる推定です。プロフィールを確認して追加してください。
          </HypothesisNote>
          <ul className="mt-2 divide-y divide-ink-100">
            {state.candidates.map((candidate) => (
              <CandidateRow
                key={candidate.xUserId}
                candidate={candidate}
                genre={state.genre ?? ""}
              />
            ))}
          </ul>
        </Card>
      )}
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : candidate.score >= 50
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-ink-200 bg-ink-50 text-ink-600";

  return (
    <li className="flex flex-wrap items-start gap-4 py-4">
      <span
        className={`mt-0.5 inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border text-[15px] font-bold tabular-nums ${scoreTone}`}
        title="COMPETITOR SCORE (AI推定)"
      >
        {candidate.score}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[13px] font-semibold text-ink-900">
          {candidate.displayName}
          <span className="ml-1.5 font-normal text-ink-400">
            @{candidate.handle}
          </span>
          <span className="ml-2 text-xs font-normal tabular-nums text-ink-500">
            フォロワー {formatNumber(candidate.followers)}
          </span>
        </p>
        {candidate.profile ? (
          <p className="text-xs leading-relaxed text-ink-600">
            {candidate.profile}
          </p>
        ) : null}
        {candidate.reasons.length > 0 ? (
          <p className="flex flex-wrap items-start gap-2 text-xs leading-relaxed text-violet-800">
            <Tag tone="hypothesis">AI推定</Tag>
            <span className="min-w-0 flex-1">
              {candidate.reasons.join(" / ")}
            </span>
          </p>
        ) : null}
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>

      <div className="shrink-0">
        {candidate.alreadyRegistered || state.success ? (
          <span className="inline-flex items-center rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-500">
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
            <SubmitButton
              variant="secondary"
              fullWidth={false}
              pendingLabel="追加中..."
            >
              ベンチマークに追加
            </SubmitButton>
          </form>
        )}
      </div>
    </li>
  );
}
