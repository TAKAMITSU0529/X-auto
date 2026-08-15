"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runDueNowAction, type RunNowState } from "./actions";

const initialState: RunNowState = { error: null, success: null };

/** worker を起動していない環境向けの手動実行ボタン (開発・デモ用) */
export function RunNowButton() {
  const [state, formAction] = useActionState(runDueNowAction, initialState);

  return (
    <div className="text-right">
      <form action={formAction}>
        <RunNowSubmit />
      </form>
      {state.success ? (
        <p className="mt-1 text-xs text-emerald-700">{state.success}</p>
      ) : null}
      {state.error ? (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}

function RunNowSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50 disabled:opacity-60"
    >
      {pending ? "処理中..." : "期限が来た予約を今すぐ処理"}
    </button>
  );
}
