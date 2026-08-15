"use client";

import { useActionState } from "react";
import { savePillarsAction, type PillarsFormState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

const initialState: PillarsFormState = { error: null, success: null };

export type PillarRowDefault = {
  name: string;
  ratio: number;
  keywords: string;
};

export type PurposeDefault = {
  key: string;
  label: string;
  ratio: number;
};

export function PillarsForm({
  rows,
  purposes,
}: {
  rows: PillarRowDefault[];
  purposes: PurposeDefault[];
}) {
  const [state, formAction] = useActionState(savePillarsAction, initialState);

  const inputClass =
    "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-3">
        <div className="border-b border-ink-100 pb-2">
          <h2 className="text-sm font-semibold text-ink-900">
            発信テーマの柱（最大6つ）
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            名前が空の行は無視されます。キーワードは実際の投稿を柱に分類するために使います（部分一致）。
          </p>
        </div>

        <div className="hidden gap-2 text-xs font-medium text-ink-500 sm:grid sm:grid-cols-[minmax(0,3fr)_70px_minmax(0,4fr)]">
          <span>柱の名前</span>
          <span>比率 %</span>
          <span>分類キーワード（カンマ区切り）</span>
        </div>

        {rows.map((row, i) => (
          <div
            key={i}
            className="grid gap-2 sm:grid-cols-[minmax(0,3fr)_70px_minmax(0,4fr)]"
          >
            <input
              name={`pillar-${i}-name`}
              defaultValue={row.name}
              placeholder={`例：${["AI導入事例", "業務改善ノウハウ", "経営の考え方", "ツール活用", "実績・数字", "人間性・価値観"][i]}`}
              className={inputClass}
            />
            <input
              name={`pillar-${i}-ratio`}
              type="number"
              min={0}
              max={100}
              defaultValue={row.ratio || ""}
              placeholder="30"
              className={inputClass}
            />
            <input
              name={`pillar-${i}-keywords`}
              defaultValue={row.keywords}
              placeholder="例：導入, 事例, 削減"
              className={inputClass}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="border-b border-ink-100 pb-2">
          <h2 className="text-sm font-semibold text-ink-900">
            目的別比率（Reach / Authority / Trust / Education / Conversion）
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            投稿を目的別に設計するための目標比率です。合計100%以内で調整してください。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {purposes.map((p) => (
            <label key={p.key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">
                {p.label}
              </span>
              <input
                name={`purpose-${p.key}`}
                type="number"
                min={0}
                max={100}
                defaultValue={p.ratio}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton>CONTENT PILLARS を保存</SubmitButton>
    </form>
  );
}
