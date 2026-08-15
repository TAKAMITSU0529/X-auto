"use client";

import { useActionState } from "react";
import { addKnowledgeAction, type KnowledgeFormState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/form";

const initialState: KnowledgeFormState = { error: null, success: null };

export function KnowledgeForm({ kinds }: { kinds: readonly string[] }) {
  const [state, formAction] = useActionState(addKnowledgeAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            種類
          </span>
          <select
            name="kind"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="タイトル"
          name="title"
          required
          placeholder="例：製造業A社で月20時間削減した手順"
        />
      </div>

      <TextArea
        label="内容"
        name="content"
        rows={5}
        placeholder="あなた自身の言葉で。数字・固有の状況・そこから得た学びが入っているほど、生成される投稿が「本人の発信」になります"
      />
      <Field
        label="タグ（カンマ区切り・任意）"
        name="tags"
        placeholder="例：導入事例, 製造業, 業務削減"
      />

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton>ナレッジを追加</SubmitButton>
    </form>
  );
}
