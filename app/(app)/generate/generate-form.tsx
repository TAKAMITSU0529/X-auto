"use client";

import { useActionState } from "react";
import { generateAction, type GenerateState } from "./actions";
import {
  Field,
  FormError,
  SubmitButton,
  TextArea,
  selectClassName,
} from "@/components/form";

const initialState: GenerateState = { error: null };

const PURPOSES = ["認知", "共感", "教育", "販売", "その他"];

/** CUSTOMER JOURNEY の段階 (F-09)。「この投稿は誰の、どの段階向けか」 */
const JOURNEY_STAGES = ["指定なし", "認知", "興味", "信頼", "比較", "相談", "購入"];

export function GenerateForm({
  sourcePostId,
  patternId,
  defaultGenre,
  defaultMessage,
}: {
  sourcePostId?: string;
  patternId?: string;
  defaultGenre?: string;
  defaultMessage?: string;
}) {
  const [state, formAction] = useActionState(generateAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {sourcePostId ? (
        <input type="hidden" name="sourcePostId" value={sourcePostId} />
      ) : null}
      {patternId ? (
        <input type="hidden" name="patternId" value={patternId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="発信ジャンル"
          name="genre"
          required
          defaultValue={defaultGenre}
          placeholder="例：中小企業のAI活用"
        />
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            投稿の目的
          </span>
          <select name="purpose" className={selectClassName}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            ターゲット段階（CUSTOMER JOURNEY）
          </span>
          <select name="journeyStage" className={selectClassName}>
            {JOURNEY_STAGES.map((s) => (
              <option key={s} value={s === "指定なし" ? "" : s}>
                {s}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-400">
            マーケティング戦略（F-09）の段階設定。誰のどの段階向けの投稿かを指定できます
          </span>
        </label>
      </div>

      <TextArea
        label="今回伝えたいこと"
        name="message"
        rows={3}
        defaultValue={defaultMessage}
        placeholder="例：AIツールは導入より定着が大事。まず1部署で小さく回すべき"
      />
      <TextArea
        label="自分の経験・具体例（任意）"
        name="experience"
        rows={2}
        placeholder="例：先月支援した製造業のクライアントでは、経理部だけで先行導入して月20時間削減できた"
      />

      <FormError message={state.error} />
      <SubmitButton
        fullWidth={false}
        pendingLabel="生成中...（数十秒かかることがあります）"
      >
        3案を生成する
      </SubmitButton>
    </form>
  );
}
