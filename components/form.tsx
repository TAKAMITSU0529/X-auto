"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui";

/**
 * フォーム部品。
 * 入力欄の見た目は control() に集約し、全画面で高さ・角丸・
 * フォーカス表現が揃うようにしている。
 */

const CONTROL =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-xs outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

export function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string | number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-700">
        {label}
        {required ? (
          <span className="text-[10px] font-bold text-brand-600">必須</span>
        ) : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={CONTROL}
      />
      {hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-ink-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  rows = 3,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
      </span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${CONTROL} resize-y leading-relaxed`}
      />
      {hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-ink-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * 入力コントロールのスタイル。
 * `Field` / `TextArea` で表現できない入力（number の min/max、
 * 横並びのフィルタ、`<select>` など）をページ側で直接書くときに使う。
 */
export const controlClassName = CONTROL;

/** @deprecated `controlClassName` を使う（select 専用ではないため） */
export const selectClassName = CONTROL;

/** チェックボックス1行。ラベル全体が押せる */
export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 bg-white px-3.5 py-3 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50 has-checked:border-brand-300 has-checked:bg-brand-50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink-800">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-800"
    >
      <span className="mt-0.5 shrink-0 text-rose-500">●</span>
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-relaxed text-emerald-800"
    >
      <span className="mt-0.5 shrink-0 text-emerald-500">●</span>
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel = "処理中...",
  fullWidth = true,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  pendingLabel?: string;
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_6px_16px_-8px_rgba(43,79,230,0.7)] hover:from-brand-600 hover:to-brand-700"
      : "border border-ink-200 bg-white text-ink-700 shadow-xs hover:border-ink-300 hover:bg-ink-50";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${styles} ${fullWidth ? "w-full" : ""}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** 処理中を示すスピナー (実体は ui.tsx。従来の import 先を保つため再export) */
export { Spinner };
