"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runSnapshotsNowAction, type SnapshotState } from "./actions";

const initialState: SnapshotState = { error: null, success: null };

/** worker を起動していない環境向けの手動スナップショット実行 (開発・デモ用) */
export function SnapshotNowButton() {
  const [state, formAction] = useActionState(
    runSnapshotsNowAction,
    initialState,
  );

  return (
    <div className="text-right">
      <form action={formAction}>
        <Submit />
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

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50 disabled:opacity-60"
    >
      {pending ? "取得中..." : "メトリクスを今すぐ取得"}
    </button>
  );
}
