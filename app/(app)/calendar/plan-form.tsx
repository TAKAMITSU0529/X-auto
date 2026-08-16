"use client";

import { useActionState } from "react";
import { createPlanAction, type PlanState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import { Card, Tag } from "@/components/ui";

const initialState: PlanState = { error: null, success: null };

const CONTROL =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm tabular-nums text-ink-900 shadow-xs outline-none transition duration-200 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

/** AUTO CONTENT PLAN (F-23) の生成フォーム */
export function PlanForm({ defaultStartDate }: { defaultStartDate: string }) {
  const [state, formAction] = useActionState(createPlanAction, initialState);

  return (
    <Card>
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-900">
          <Tag tone="hypothesis">AI推定</Tag>
          AUTO CONTENT PLAN — 月間投稿計画をAIに設計させる
        </summary>
        <form action={formAction} className="mt-4 space-y-4">
          <p className="rounded-xl border border-ink-200 bg-ink-25 px-3.5 py-2.5 text-xs leading-relaxed text-ink-500">
            柱の比率（F-18）・マーケティング戦略（F-09）・あなたの実績（F-10）から、AIが投稿ネタを設計してカレンダーに「計画」として配置します。配置されるのはネタ（タイトル・切り口）であり、本文の生成・予約はあなたの承認を経て行います（完全自動投稿はしません）。
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-28">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
                投稿数
              </span>
              <input
                type="number"
                name="count"
                min={1}
                max={31}
                defaultValue={12}
                className={CONTROL}
              />
            </label>
            <label className="w-40">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
                開始日
              </span>
              <input
                type="date"
                name="startDateKey"
                defaultValue={defaultStartDate}
                className={CONTROL}
              />
            </label>
            <SubmitButton
              fullWidth={false}
              pendingLabel="設計中...（数十秒かかることがあります）"
            >
              計画を生成して配置
            </SubmitButton>
          </div>
          <FormError message={state.error} />
          <FormSuccess message={state.success} />
        </form>
      </details>
    </Card>
  );
}
