"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { trendAnalyzeAction, type TrendState } from "./actions";
import { FormError } from "@/components/form";
import { Card } from "@/components/ui";

const initialState: TrendState = {
  error: null,
  genre: null,
  result: null,
  fetchedCount: 0,
};

export function TrendForm() {
  const [state, formAction] = useActionState(trendAnalyzeAction, initialState);

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
              placeholder="例：生成AI 業務改善"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <TrendSubmit />
        </form>
        <p className="mt-2 text-xs text-ink-400">
          直近7日の検索（最大50件）を使用します。検索はAPIコストが掛かるため、取得件数は自動で制限されます。
        </p>
        <div className="mt-2">
          <FormError message={state.error} />
        </div>
      </Card>

      {state.result ? (
        <>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
            <span className="mr-2 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
              AI推定
            </span>
            <span className="text-sm text-violet-900">{state.result.summary}</span>
            <span className="ml-2 text-xs text-violet-600">
              （分析対象 {state.fetchedCount} 件）
            </span>
          </div>

          {/* TREND RADAR 4分類 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <RadarCard
              title="RISING — 急上昇"
              tone="border-rose-200 bg-rose-50 text-rose-800"
              items={state.result.risingTopics}
              hint="今乗るべきテーマ"
            />
            <RadarCard
              title="OPPORTUNITY — 空白地帯"
              tone="border-emerald-200 bg-emerald-50 text-emerald-800"
              items={state.result.opportunityTopics}
              hint="需要があるのに発信者が少ない"
            />
            <RadarCard
              title="EVERGREEN — 定番"
              tone="border-brand-100 bg-brand-50 text-brand-700"
              items={state.result.evergreenTopics}
              hint="継続的に反応が取れる"
            />
            <RadarCard
              title="SATURATED — 飽和"
              tone="border-ink-200 bg-ink-50 text-ink-600"
              items={state.result.saturatedTopics}
              hint="競合過多。避けるか逆張りで"
            />
          </div>

          {state.result.frequentKeywords.length > 0 ? (
            <Card>
              <p className="mb-2 text-xs font-semibold text-ink-500">
                頻出キーワード
              </p>
              <div className="flex flex-wrap gap-1.5">
                {state.result.frequentKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              投稿ネタ候補 — 次にやること
            </h2>
            <ul className="divide-y divide-ink-100">
              {state.result.postIdeas.map((idea, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">
                      {idea.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">{idea.angle}</p>
                  </div>
                  <Link
                    href={`/generate?genre=${encodeURIComponent(state.genre ?? "")}&message=${encodeURIComponent(`${idea.title}。${idea.angle}`)}`}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                  >
                    この内容で3案生成
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function RadarCard({
  title,
  tone,
  items,
  hint,
}: {
  title: string;
  tone: string;
  items: string[];
  hint: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-bold tracking-wide">{title}</p>
      <p className="mb-2 text-[11px] opacity-70">{hint}</p>
      <ul className="list-inside list-disc space-y-1 text-sm">
        {items.length === 0 ? <li className="opacity-60">該当なし</li> : null}
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TrendSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "分析中...（数十秒かかることがあります）" : "トレンドを分析"}
    </button>
  );
}
