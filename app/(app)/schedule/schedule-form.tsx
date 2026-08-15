"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { schedulePostAction, type ScheduleState } from "./actions";
import { FormError, FormSuccess } from "@/components/form";

const initialState: ScheduleState = { error: null, success: null };

export function ScheduleForm({
  generatedPostId,
  accounts,
}: {
  generatedPostId: string;
  accounts: { id: string; handle: string }[];
}) {
  const [state, formAction] = useActionState(schedulePostAction, initialState);
  const [tzOffset, setTzOffset] = useState(0);
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    setTzOffset(new Date().getTimezoneOffset());
    // datetime-local の最小値 (現在のローカル時刻)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));
  }, []);

  if (accounts.length === 0) return null;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="generatedPostId" value={generatedPostId} />
      <input type="hidden" name="tzOffsetMinutes" value={tzOffset} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="w-44">
          <span className="mb-1 block text-xs font-medium text-ink-700">
            投稿先
          </span>
          <select
            name="xAccountId"
            className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.handle}
              </option>
            ))}
          </select>
        </label>

        <label className="w-52">
          <span className="mb-1 block text-xs font-medium text-ink-700">
            予約日時
          </span>
          <input
            type="datetime-local"
            name="scheduledAtLocal"
            required
            min={minDateTime}
            className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500"
          />
        </label>

        <ScheduleSubmit />
      </div>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}

function ScheduleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "予約中..." : "予約する"}
    </button>
  );
}
