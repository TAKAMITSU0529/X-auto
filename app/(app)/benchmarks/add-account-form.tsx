"use client";

import { useActionState } from "react";
import { addAccountAction, type ActionState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

const emptyState: ActionState = { error: null, success: null };

export function AddAccountForm({ listId }: { listId: string }) {
  const [state, formAction] = useActionState(addAccountAction, emptyState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="listId" value={listId} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block text-xs font-medium text-ink-700">
            @ID または プロフィールURL
          </span>
          <input
            name="handle"
            required
            placeholder="@example または https://x.com/example"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="w-40">
          <span className="mb-1.5 block text-xs font-medium text-ink-700">
            ジャンル（任意）
          </span>
          <input
            name="genre"
            placeholder="例：AI活用"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="w-36">
          <SubmitButton>アカウント追加</SubmitButton>
        </div>
      </div>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}
