"use client";

import { useActionState } from "react";
import { addAccountAction, type ActionState } from "./actions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  selectClassName,
} from "@/components/form";

const emptyState: ActionState = { error: null, success: null };

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-700";

export function AddAccountForm({ listId }: { listId: string }) {
  const [state, formAction] = useActionState(addAccountAction, emptyState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="listId" value={listId} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className={LABEL}>@ID または プロフィールURL</span>
          <input
            name="handle"
            required
            placeholder="@example または https://x.com/example"
            className={selectClassName}
          />
        </label>

        <label className="w-40">
          <span className={LABEL}>ジャンル（任意）</span>
          <input
            name="genre"
            placeholder="例：AI活用"
            className={selectClassName}
          />
        </label>

        <div className="w-36">
          <SubmitButton pendingLabel="追加中...">アカウント追加</SubmitButton>
        </div>
      </div>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}
