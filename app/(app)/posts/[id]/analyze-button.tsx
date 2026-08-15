"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { analyzePostAction, type PostActionState } from "./actions";
import { FormError } from "@/components/form";

const initialState: PostActionState = { error: null, success: null };

export function AnalyzeButton({
  postId,
  analyzed,
}: {
  postId: string;
  analyzed: boolean;
}) {
  const [state, formAction] = useActionState(analyzePostAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <AnalyzeSubmit analyzed={analyzed} />
      <FormError message={state.error} />
    </form>
  );
}

function AnalyzeSubmit({ analyzed }: { analyzed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "分析中...（数十秒かかることがあります）"
        : analyzed
          ? "AIで再分析する"
          : "AIで分析する"}
    </button>
  );
}
