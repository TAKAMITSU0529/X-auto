"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  generateInsightAction,
  generatePlaybookAction,
  type AiRunState,
} from "./actions";
import { FormError } from "@/components/form";

const initialState: AiRunState = { error: null };

function RunButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** CUSTOMER INSIGHT の生成ボタン (F-09) */
export function InsightRunner({ hasInsight }: { hasInsight: boolean }) {
  const [state, formAction] = useActionState(generateInsightAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <RunButton
        label={hasInsight ? "CUSTOMER INSIGHT を再生成" : "CUSTOMER INSIGHT を生成"}
        pendingLabel="生成中...（数十秒かかることがあります）"
      />
    </form>
  );
}

/** MARKETING PLAYBOOK の生成ボタン (F-09) */
export function PlaybookRunner({ hasPlaybook }: { hasPlaybook: boolean }) {
  const [state, formAction] = useActionState(generatePlaybookAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <RunButton
        label={hasPlaybook ? "PLAYBOOK を再生成" : "PLAYBOOK を生成"}
        pendingLabel="生成中...（数十秒かかることがあります）"
      />
    </form>
  );
}
