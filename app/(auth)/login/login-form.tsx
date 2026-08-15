"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "../actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initialState: AuthFormState = { error: null };

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

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
        autoComplete="current-password"
        required
      />

      <FormError message={state.error} />
      <SubmitButton>ログイン</SubmitButton>
    </form>
  );
}
