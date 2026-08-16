"use client";

import { useActionState } from "react";
import { updateBudgetAction, type SettingsState } from "./actions";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

const initialSettingsState: SettingsState = { error: null, success: null };

export function BudgetForm({
  defaults,
}: {
  defaults: {
    monthlyLimitUsd: number;
    warningRatio: number;
    maxPostsPerResearch: number;
    enforceHardStop: boolean;
  };
}) {
  const [state, formAction] = useActionState(
    updateBudgetAction,
    initialSettingsState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="月額上限（USD）"
          name="monthlyLimitUsd"
          type="number"
          defaultValue={defaults.monthlyLimitUsd}
          hint="この額に達すると取得系機能を停止します"
        />
        <Field
          label="警告ライン（0〜1）"
          name="warningRatio"
          type="number"
          defaultValue={defaults.warningRatio}
          hint="0.8 = 上限の80%到達で画面上部に警告を表示"
        />
      </div>
      <Field
        label="1回のリサーチの最大取得件数"
        name="maxPostsPerResearch"
        type="number"
        defaultValue={defaults.maxPostsPerResearch}
        hint="これを超える件数を指定しても自動で丸められます"
      />

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 bg-ink-25 px-3.5 py-3 transition duration-200 hover:border-ink-300 has-checked:border-brand-200 has-checked:bg-brand-50/60">
        <input
          type="checkbox"
          name="enforceHardStop"
          defaultChecked={defaults.enforceHardStop}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-600"
        />
        <span className="text-[13px] leading-relaxed text-ink-700">
          上限到達時に取得を停止する
        </span>
      </label>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton pendingLabel="保存中..." fullWidth={false}>
        設定を保存
      </SubmitButton>
    </form>
  );
}
