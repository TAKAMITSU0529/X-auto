"use client";

import { useActionState } from "react";
import { runResearchAction, type ResearchState } from "./actions";
import { FormError, SubmitButton } from "@/components/form";

const initialResearchState: ResearchState = { error: null, success: null };

type AccountOption = {
  id: string;
  handle: string;
  displayName: string | null;
  listName: string;
};

const COUNT_OPTIONS = [20, 50, 100, 200, 300, 500];

const PERIOD_OPTIONS = [
  { value: 0, label: "全期間" },
  { value: 30, label: "直近30日" },
  { value: 90, label: "直近90日" },
];

export function ResearchForm({
  accounts,
  selectedAccountId,
}: {
  accounts: AccountOption[];
  selectedAccountId?: string;
}) {
  const [state, formAction] = useActionState(
    runResearchAction,
    initialResearchState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[240px] flex-1">
          <span className="mb-1.5 block text-xs font-medium text-ink-700">
            対象アカウント
          </span>
          <select
            name="accountId"
            defaultValue={selectedAccountId ?? accounts[0]?.id}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.handle}
                {a.displayName ? `（${a.displayName}）` : ""} — {a.listName}
              </option>
            ))}
          </select>
        </label>

        <label className="w-36">
          <span className="mb-1.5 block text-xs font-medium text-ink-700">
            取得件数
          </span>
          <select
            name="maxResults"
            defaultValue={100}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} 件
              </option>
            ))}
          </select>
        </label>

        <label className="w-36">
          <span className="mb-1.5 block text-xs font-medium text-ink-700">
            期間
          </span>
          <select
            name="sinceDays"
            defaultValue={0}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="w-40">
          <SubmitButton>リサーチ実行</SubmitButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-ink-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="excludeReplies"
            defaultChecked
            className="h-4 w-4 rounded border-ink-300"
          />
          リプライを除外
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="excludeReposts"
            defaultChecked
            className="h-4 w-4 rounded border-ink-300"
          />
          リポストを除外
        </label>
      </div>

      <p className="text-xs text-ink-400">
        取得件数は設定の BUDGET LIMIT（1回あたりの上限）を超えない範囲に自動で丸められます。
        同じアカウントを24時間以内に再取得した場合はキャッシュを使い、APIコストは発生しません。
      </p>

      <FormError message={state.error} />
    </form>
  );
}
