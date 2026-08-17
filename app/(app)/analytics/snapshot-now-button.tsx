"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runSnapshotsNowAction, type SnapshotState } from "./actions";
import { Spinner } from "@/components/form";

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
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-700">
          {state.success}
        </p>
      ) : null}
      {state.error ? (
        <p className="mt-1.5 text-xs leading-relaxed text-rose-600">
          {state.error}
        </p>
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
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Spinner />
          取得中...
        </>
      ) : (
        "メトリクスを今すぐ取得"
      )}
    </button>
  );
}
