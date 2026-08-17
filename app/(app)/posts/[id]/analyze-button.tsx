"use client";

import { useActionState } from "react";
import { analyzePostAction, type PostActionState } from "./actions";
import { FormError, SubmitButton } from "@/components/form";

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
      <SubmitButton pendingLabel="分析中...（数十秒かかることがあります）">
        {analyzed ? "AIで再分析する" : "AIで分析する"}
      </SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
