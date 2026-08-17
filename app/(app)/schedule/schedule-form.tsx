"use client";

import { useActionState, useEffect, useState } from "react";
import { schedulePostAction, type ScheduleState } from "./actions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  selectClassName,
} from "@/components/form";

const initialState: ScheduleState = { error: null, success: null };

const CONTROL =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-xs outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

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
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="generatedPostId" value={generatedPostId} />
      <input type="hidden" name="tzOffsetMinutes" value={tzOffset} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="w-44">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            投稿先
          </span>
          <select name="xAccountId" className={selectClassName}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.handle}
              </option>
            ))}
          </select>
        </label>

        <label className="w-52">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            予約日時
          </span>
          <input
            type="datetime-local"
            name="scheduledAtLocal"
            required
            min={minDateTime}
            className={`${CONTROL} tabular-nums`}
          />
        </label>

        <SubmitButton fullWidth={false} pendingLabel="予約中...">
          予約する
        </SubmitButton>
      </div>

      <details className="rounded-xl border border-ink-200 bg-ink-25 px-3.5 py-2.5">
        <summary className="cursor-pointer text-xs font-semibold text-ink-600 transition duration-200 hover:text-ink-900">
          スレッド・画像を追加（任意）
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
              スレッド（2投稿目以降・空行2つで区切ると複数投稿）
            </span>
            <textarea
              name="threadText"
              rows={4}
              placeholder={"2投稿目の本文\n\n\n3投稿目の本文"}
              className={`${CONTROL} resize-y leading-relaxed`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
              画像URL（1投稿目に添付・改行区切りで最大4枚）
            </span>
            <textarea
              name="mediaUrlsText"
              rows={2}
              placeholder="https://example.com/image1.png"
              className={`${CONTROL} resize-y leading-relaxed`}
            />
            <span className="mt-1.5 block text-xs leading-relaxed text-ink-400">
              投稿時にURLの画像をXへアップロードして添付します（5MBまで／モックモードでは記録のみ）
            </span>
          </label>
        </div>
      </details>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}
