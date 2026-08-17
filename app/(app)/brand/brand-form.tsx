"use client";

import { useActionState, useRef, useState } from "react";
import { saveBrandAction, type BrandFormState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/form";
import { Card, CardHeader, MeterBar } from "@/components/ui";

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

/** 入力状況カウント用。フォームの name と BrandDefaults のキーは対応している */
const BASIC_FIELDS = [
  "displayName",
  "occupation",
  "company",
  "expertise",
  "business",
  "strengths",
  "achievements",
  "products",
] as const;
const STYLE_TEXT_FIELDS = ["firstPerson", "styleNote"] as const;
const PROHIBITED_FIELDS = [
  "prohibitedExpressions",
  "prohibitedTopics",
] as const;

const SECTIONS = [
  { id: "brand-basic", label: "基本情報", key: "basic", total: 8 },
  { id: "brand-style", label: "発信スタイル", key: "style", total: 3 },
  { id: "brand-prohibited", label: "禁止事項", key: "prohibited", total: 2 },
] as const;

type Progress = {
  basic: number;
  style: number;
  prohibited: number;
  tones: number;
};

function countProgress(
  get: (name: string) => string,
  toneCount: number,
): Progress {
  const filled = (names: readonly string[]) =>
    names.filter((n) => get(n).trim().length > 0).length;

  return {
    basic: filled(BASIC_FIELDS),
    style: (toneCount > 0 ? 1 : 0) + filled(STYLE_TEXT_FIELDS),
    prohibited: filled(PROHIBITED_FIELDS),
    tones: toneCount,
  };
}

export function BrandForm({ defaults }: { defaults: BrandDefaults }) {
  const [state, formAction] = useActionState(saveBrandAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [progress, setProgress] = useState<Progress>(() =>
    countProgress(
      (name) => String(defaults[name as keyof BrandDefaults] ?? ""),
      defaults.tones.length,
    ),
  );

  /** 入力のたびに「どこまで埋まったか」を数え直す (表示のみ・送信内容には影響しない) */
  const recount = () => {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setProgress(
      countProgress(
        (name) => String(data.get(name) ?? ""),
        data.getAll("tones").length,
      ),
    );
  };

  const totalFilled = progress.basic + progress.style + progress.prohibited;
  const totalFields = SECTIONS.reduce((sum, s) => sum + s.total, 0);

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={recount}
      onChange={recount}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div className="space-y-6">
        <section id="brand-basic" className="scroll-mt-6">
          <Card>
            <CardHeader
              title="基本情報"
              description="あなたが何者で、誰に何を提供しているか。投稿の説得力の土台になります。"
              action={<CountChip filled={progress.basic} total={8} />}
            />
            <div className="space-y-4">
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
            </div>
          </Card>
        </section>

        <section id="brand-style" className="scroll-mt-6">
          <Card>
            <CardHeader
              title="発信スタイル"
              description="生成される文章のトーンと文体を決めます。"
              action={<CountChip filled={progress.style} total={3} />}
            />
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-700">
                    トーン（4つまで）
                  </span>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      progress.tones > 4 ? "text-amber-600" : "text-ink-500"
                    }`}
                  >
                    選択中 {progress.tones} / 4
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <label
                      key={tone}
                      className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
                    >
                      <input
                        type="checkbox"
                        name="tones"
                        value={tone}
                        defaultChecked={defaults.tones.includes(tone)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-ink-300 transition duration-200 peer-checked:bg-brand-500 peer-checked:ring-4 peer-checked:ring-brand-500/15"
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
            </div>
          </Card>
        </section>

        <section id="brand-prohibited" className="scroll-mt-6">
          <Card>
            <CardHeader
              title="禁止事項"
              description="生成時に避ける表現とテーマ。ここを埋めるほど手直しが減ります。"
              action={<CountChip filled={progress.prohibited} total={2} />}
            />
            <div className="space-y-4">
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
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 bg-ink-25 px-3.5 py-3 transition duration-200 hover:border-ink-300 has-checked:border-brand-200 has-checked:bg-brand-50/60">
                <input
                  type="checkbox"
                  name="noExaggeration"
                  defaultChecked={defaults.noExaggeration}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-600"
                />
                <span className="text-[13px] leading-relaxed text-ink-700">
                  誇張表現を禁止する（実績の水増し・断定的な効果予測をさせない）
                </span>
              </label>
            </div>
          </Card>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card>
          <CardHeader
            title="入力状況"
            description="空欄のままでも保存できます。埋まっているほど生成の精度が上がります。"
          />

          <div className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                全体
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-ink-900">
                {totalFilled}
                <span className="text-ink-400"> / {totalFields}</span>
              </span>
            </div>
            <MeterBar ratio={totalFilled / totalFields} />
          </div>

          <ul className="divide-y divide-ink-100 border-t border-ink-100">
            {SECTIONS.map((section) => {
              const filled = progress[section.key];
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition duration-200 hover:bg-ink-50"
                  >
                    <span className="text-[13px] text-ink-700">
                      {section.label}
                    </span>
                    <CountChip filled={filled} total={section.total} />
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
            <FormError message={state.error} />
            <FormSuccess message={state.success} />
            <SubmitButton pendingLabel="保存中...">
              MY BRAND を保存
            </SubmitButton>
          </div>
        </Card>
      </aside>
    </form>
  );
}

/** セクションごとの入力済み件数 */
function CountChip({ filled, total }: { filled: number; total: number }) {
  const done = filled === total;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        done
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-ink-50 text-ink-500"
      }`}
    >
      {filled} / {total}
    </span>
  );
}
