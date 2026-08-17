"use client";

import { useActionState } from "react";
import { runResearchAction, type ResearchState } from "./actions";
import { FormError, SubmitButton, selectClassName } from "@/components/form";

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

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-700";
const CHECKBOX = "h-4 w-4 rounded border-ink-300 accent-brand-600";

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
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1">
          <span className={LABEL}>対象アカウント</span>
          <select
            name="accountId"
            defaultValue={selectedAccountId ?? accounts[0]?.id}
            className={selectClassName}
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
          <span className={LABEL}>取得件数</span>
          <select
            name="maxResults"
            defaultValue={100}
            className={selectClassName}
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} 件
              </option>
            ))}
          </select>
        </label>

        <label className="w-36">
          <span className={LABEL}>期間</span>
          <select name="sinceDays" defaultValue={0} className={selectClassName}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="w-40">
          <SubmitButton pendingLabel="取得中...">リサーチ実行</SubmitButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-4 text-[13px] text-ink-600">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="excludeReplies"
            defaultChecked
            className={CHECKBOX}
          />
          リプライを除外
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="excludeReposts"
            defaultChecked
            className={CHECKBOX}
          />
          リポストを除外
        </label>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        取得件数は設定の BUDGET LIMIT（1回あたりの上限）を超えない範囲に自動で丸められます。
        同じアカウントを24時間以内に再取得した場合はキャッシュを使い、APIコストは発生しません。
      </p>

      <FormError message={state.error} />
    </form>
  );
}
