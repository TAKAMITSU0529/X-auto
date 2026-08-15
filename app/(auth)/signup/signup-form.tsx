"use client";

import { useActionState } from "react";
import { signupAction, type AuthFormState } from "../actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initialState: AuthFormState = { error: null };

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="名前" name="name" autoComplete="name" required />
      <Field
        label="メールアドレス"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label="パスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="8文字以上"
      />
      <Field
        label="パスワード（確認）"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
      />

      <FormError message={state.error} />
      <SubmitButton>登録してはじめる</SubmitButton>
    </form>
  );
}
