"use client";

import { useActionState } from "react";
import { createListAction, type ActionState } from "./actions";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

const emptyState: ActionState = { error: null, success: null };

export function CreateListForm() {
  const [state, formAction] = useActionState(createListAction, emptyState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="リスト名"
        name="name"
        required
        placeholder="例：AI経営者"
      />
      <Field
        label="ジャンルタグ"
        name="genreTag"
        placeholder="例：AI活用"
        hint="任意"
      />
      <Field label="メモ" name="memo" placeholder="任意" />

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton pendingLabel="作成中...">リストを作成</SubmitButton>
    </form>
  );
}
