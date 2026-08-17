"use client";

import { useActionState } from "react";
import { trendAnalyzeAction, type TrendState } from "./actions";
import { FormError, SubmitButton, selectClassName } from "@/components/form";
import {
  Card,
  CardHeader,
  DataNote,
  HypothesisNote,
  NextActionButton,
  Tag,
} from "@/components/ui";

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
        <CardHeader
          title="ジャンルを指定して分析"
          description="直近7日の検索（最大50件）を使用します。検索はAPIコストが掛かるため、取得件数は自動で制限されます。"
        />
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
              ジャンル・キーワード
            </span>
            <input
              name="genre"
              required
              placeholder="例：生成AI 業務改善"
              className={selectClassName}
            />
          </label>
          <div className="w-48">
            <SubmitButton pendingLabel="分析中...（数十秒かかることがあります）">
              トレンドを分析
            </SubmitButton>
          </div>
        </form>
        <div className="mt-3">
          <FormError message={state.error} />
        </div>
      </Card>

      {state.result ? (
        <>
          <div className="space-y-3">
            <HypothesisNote>{state.result.summary}</HypothesisNote>
            <DataNote>
              分析対象{" "}
              <span className="font-semibold tabular-nums">
                {state.fetchedCount}
              </span>{" "}
              件
            </DataNote>
          </div>

          {/* TREND RADAR 4分類 */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                TREND RADAR
              </h2>
              <Tag tone="hypothesis">AI推定</Tag>
            </div>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <RadarCard
                title="RISING — 急上昇"
                tone="border-rose-200 bg-rose-50/70 text-rose-900"
                accent="text-rose-700"
                items={state.result.risingTopics}
                hint="今乗るべきテーマ"
              />
              <RadarCard
                title="OPPORTUNITY — 空白地帯"
                tone="border-emerald-200 bg-emerald-50/70 text-emerald-900"
                accent="text-emerald-700"
                items={state.result.opportunityTopics}
                hint="需要があるのに発信者が少ない"
              />
              <RadarCard
                title="EVERGREEN — 定番"
                tone="border-brand-200 bg-brand-50/70 text-brand-900"
                accent="text-brand-700"
                items={state.result.evergreenTopics}
                hint="継続的に反応が取れる"
              />
              <RadarCard
                title="SATURATED — 飽和"
                tone="border-ink-200 bg-ink-50 text-ink-700"
                accent="text-ink-500"
                items={state.result.saturatedTopics}
                hint="競合過多。避けるか逆張りで"
              />
            </div>
          </section>

          {state.result.frequentKeywords.length > 0 ? (
            <Card>
              <CardHeader title="頻出キーワード" />
              <div className="flex flex-wrap gap-1.5">
                {state.result.frequentKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="投稿ネタ候補 — 次にやること"
              description="気になる案をそのまま生成スタジオに渡せます。"
            />
            <ul className="divide-y divide-ink-100">
              {state.result.postIdeas.map((idea, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink-900">
                      {idea.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                      {idea.angle}
                    </p>
                  </div>
                  <NextActionButton
                    href={`/generate?genre=${encodeURIComponent(state.genre ?? "")}&message=${encodeURIComponent(`${idea.title}。${idea.angle}`)}`}
                  >
                    この内容で3案生成
                  </NextActionButton>
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
  accent,
  items,
  hint,
}: {
  title: string;
  tone: string;
  accent: string;
  items: string[];
  hint: string;
}) {
  return (
    <div className={`rounded-card border p-4 shadow-xs ${tone}`}>
      <p className={`text-[11px] font-bold tracking-[0.08em] ${accent}`}>
        {title}
      </p>
      <p className="mb-2.5 text-[11px] opacity-70">{hint}</p>
      <ul className="space-y-1.5 text-[13px] leading-relaxed">
        {items.length === 0 ? (
          <li className="opacity-60">該当なし</li>
        ) : null}
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
