"use client";

import { useActionState } from "react";
import { saveBrandAction, type BrandFormState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/form";

const initialState: BrandFormState = { error: null, success: null };

/** 発信スタイルの選択肢 (要件定義 F-17) */
const TONE_OPTIONS = [
  "強め",
  "優しい",
  "専門家",
  "経営者",
  "カジュアル",
  "熱量高め",
  "論理的",
  "ユーモア",
  "ストーリー型",
];

export type BrandDefaults = {
  displayName: string;
  occupation: string;
  company: string;
  business: string;
  expertise: string;
  strengths: string;
  achievements: string;
  products: string;
  tones: string[];
  firstPerson: string;
  styleNote: string;
  prohibitedExpressions: string;
  prohibitedTopics: string;
  noExaggeration: boolean;
};

export function BrandForm({ defaults }: { defaults: BrandDefaults }) {
  const [state, formAction] = useActionState(saveBrandAction, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <h2 className="border-b border-ink-100 pb-2 text-sm font-semibold text-ink-900">
          基本情報
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="名前・肩書き"
            name="displayName"
            defaultValue={defaults.displayName}
            placeholder="例：山田太郎｜AI導入支援"
          />
          <Field
            label="職業"
            name="occupation"
            defaultValue={defaults.occupation}
            placeholder="例：経営コンサルタント"
          />
          <Field
            label="会社・屋号"
            name="company"
            defaultValue={defaults.company}
          />
          <Field
            label="専門分野"
            name="expertise"
            defaultValue={defaults.expertise}
            placeholder="例：中小企業のAI活用・業務改善"
          />
        </div>
        <TextArea
          label="事業内容"
          name="business"
          defaultValue={defaults.business}
          placeholder="何をしている・誰に何を提供しているか"
        />
        <TextArea
          label="強み"
          name="strengths"
          defaultValue={defaults.strengths}
          placeholder="他の発信者と違う点"
        />
        <TextArea
          label="実績"
          name="achievements"
          defaultValue={defaults.achievements}
          placeholder="数字で言える実績（支援社数・成果など）"
        />
        <TextArea
          label="商品・サービス"
          name="products"
          defaultValue={defaults.products}
          placeholder="投稿から誘導したい商品・サービス"
        />
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-ink-100 pb-2 text-sm font-semibold text-ink-900">
          発信スタイル
        </h2>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">
            トーン（4つまで）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TONE_OPTIONS.map((tone) => (
              <label
                key={tone}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
              >
                <input
                  type="checkbox"
                  name="tones"
                  value={tone}
                  defaultChecked={defaults.tones.includes(tone)}
                  className="sr-only"
                />
                {tone}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="一人称"
            name="firstPerson"
            defaultValue={defaults.firstPerson}
            placeholder="例：私 / 僕 / うち"
          />
        </div>
        <TextArea
          label="文体メモ"
          name="styleNote"
          defaultValue={defaults.styleNote}
          placeholder="語尾の癖、絵文字の使い方、改行の好みなど"
        />
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-ink-100 pb-2 text-sm font-semibold text-ink-900">
          禁止事項
        </h2>
        <TextArea
          label="使いたくない表現・言葉"
          name="prohibitedExpressions"
          defaultValue={defaults.prohibitedExpressions}
          placeholder="例：「爆益」「誰でも簡単に」などの誇大表現"
        />
        <TextArea
          label="扱わないテーマ"
          name="prohibitedTopics"
          defaultValue={defaults.prohibitedTopics}
          placeholder="例：政治・宗教・他社批判"
        />
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="noExaggeration"
            defaultChecked={defaults.noExaggeration}
            className="h-4 w-4 rounded border-ink-300"
          />
          誇張表現を禁止する（実績の水増し・断定的な効果予測をさせない）
        </label>
      </section>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton>MY BRAND を保存</SubmitButton>
    </form>
  );
}
