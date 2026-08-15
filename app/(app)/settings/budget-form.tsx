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
      <Field
        label="1回のリサーチの最大取得件数"
        name="maxPostsPerResearch"
        type="number"
        defaultValue={defaults.maxPostsPerResearch}
        hint="これを超える件数を指定しても自動で丸められます"
      />

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="enforceHardStop"
          defaultChecked={defaults.enforceHardStop}
          className="h-4 w-4 rounded border-ink-300"
        />
        上限到達時に取得を停止する
      </label>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton>設定を保存</SubmitButton>
    </form>
  );
}
