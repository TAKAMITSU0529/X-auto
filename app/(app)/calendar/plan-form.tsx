"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPlanAction, type PlanState } from "./actions";
import { FormError, FormSuccess } from "@/components/form";

const initialState: PlanState = { error: null, success: null };

/** AUTO CONTENT PLAN (F-23) の生成フォーム */
export function PlanForm({ defaultStartDate }: { defaultStartDate: string }) {
  const [state, formAction] = useActionState(createPlanAction, initialState);

  return (
    <details className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-ink-900">
        AUTO CONTENT PLAN — 月間投稿計画をAIに設計させる
      </summary>
      <form action={formAction} className="mt-3 space-y-3">
        <p className="text-xs text-ink-500">
          柱の比率（F-18）・マーケティング戦略（F-09）・あなたの実績（F-10）から、AIが投稿ネタを設計してカレンダーに「計画」として配置します。配置されるのはネタ（タイトル・切り口）であり、本文の生成・予約はあなたの承認を経て行います（完全自動投稿はしません）。
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="w-28">
            <span className="mb-1 block text-xs font-medium text-ink-700">
              投稿数
            </span>
            <input
              type="number"
              name="count"
              min={1}
              max={31}
              defaultValue={12}
              className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <label className="w-40">
            <span className="mb-1 block text-xs font-medium text-ink-700">
              開始日
            </span>
            <input
              type="date"
              name="startDateKey"
              defaultValue={defaultStartDate}
              className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <PlanSubmit />
        </div>
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </form>
    </details>
  );
}

function PlanSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "設計中...（数十秒かかることがあります）" : "計画を生成して配置"}
    </button>
  );
}
