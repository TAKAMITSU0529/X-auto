"use client";

import { useActionState } from "react";
import {
  generateInsightAction,
  generatePlaybookAction,
  type AiRunState,
} from "./actions";
import { FormError, SubmitButton } from "@/components/form";

const initialState: AiRunState = { error: null };

/** CUSTOMER INSIGHT の生成ボタン (F-09) */
export function InsightRunner({ hasInsight }: { hasInsight: boolean }) {
  const [state, formAction] = useActionState(generateInsightAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <SubmitButton
        fullWidth={false}
        pendingLabel="生成中...（数十秒かかることがあります）"
      >
        {hasInsight
          ? "CUSTOMER INSIGHT を再生成"
          : "CUSTOMER INSIGHT を生成"}
      </SubmitButton>
    </form>
  );
}

/** MARKETING PLAYBOOK の生成ボタン (F-09) */
export function PlaybookRunner({ hasPlaybook }: { hasPlaybook: boolean }) {
  const [state, formAction] = useActionState(generatePlaybookAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <SubmitButton
        fullWidth={false}
        pendingLabel="生成中...（数十秒かかることがあります）"
      >
        {hasPlaybook ? "PLAYBOOK を再生成" : "PLAYBOOK を生成"}
      </SubmitButton>
    </form>
  );
}
