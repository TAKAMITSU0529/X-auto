"use client";

import { useActionState } from "react";
import { saveToLibraryAction, type PostActionState } from "./actions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/form";

const initialState: PostActionState = { error: null, success: null };

/** MODEL LIBRARY の分類タグ (要件定義 F-16) */
const CATEGORY_TAGS = [
  "HOOK",
  "構成",
  "ストーリー",
  "CTA",
  "教育",
  "共感",
  "権威",
  "問題提起",
  "セールス",
  "逆張り",
  "ノウハウ",
];

export function SaveToLibraryForm({ postId }: { postId: string }) {
  const [state, formAction] = useActionState(saveToLibraryAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-700">
          分類タグ（1つ以上）
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TAGS.map((tag) => (
            <label
              key={tag}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
            >
              <input
                type="checkbox"
                name="categoryTags"
                value={tag}
                className="sr-only"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <TextArea
        label="メモ（任意）"
        name="memo"
        rows={2}
        placeholder="どこを参考にしたいか"
      />

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton variant="secondary" pendingLabel="保存中...">
        ライブラリに保存
      </SubmitButton>
    </form>
  );
}
