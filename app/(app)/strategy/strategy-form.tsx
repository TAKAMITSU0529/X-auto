"use client";

import { useActionState } from "react";
import { saveStrategyAction, type StrategyFormState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/form";

const initialState: StrategyFormState = { error: null, success: null };

export type StrategyDefaults = Record<string, string>;

function Section({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-ink-100 pb-2">
        <h2 className="text-sm font-semibold text-ink-900">
          <span className="mr-2 rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
            {step}
          </span>
          {title}
        </h2>
        <p className="mt-1 text-xs text-ink-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** 設定ウィザード (F-09): WHO / WHAT / WHY / HOW */
export function StrategyForm({ defaults }: { defaults: StrategyDefaults }) {
  const [state, formAction] = useActionState(saveStrategyAction, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <Section
        step="WHO"
        title="誰に届けるか（TARGET DESIGN）"
        description="ターゲットを具体的に設計します。ここが曖昧だと投稿・プロフィール・商品すべてがぶれます。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="業種・属性"
            name="industry"
            defaultValue={defaults.industry}
            placeholder="例：従業員5〜50名の中小企業経営者"
          />
          <Field
            label="年齢層"
            name="ageRange"
            defaultValue={defaults.ageRange}
            placeholder="例：40〜60代"
          />
          <Field
            label="役職・立場"
            name="role"
            defaultValue={defaults.role}
            placeholder="例：代表取締役・部門長"
          />
          <Field
            label="売上・企業規模"
            name="companySize"
            defaultValue={defaults.companySize}
            placeholder="例：年商1〜10億円"
          />
        </div>
        <TextArea
          label="課題・悩み・不満"
          name="problems"
          defaultValue={defaults.problems}
          placeholder="例：人手不足。AIを使えと言われるが何から始めればいいか分からない"
        />
        <TextArea
          label="欲求・理想"
          name="desires"
          defaultValue={defaults.desires}
          placeholder="例：少ない人数でも回る会社にしたい"
        />
        <TextArea
          label="不安"
          name="anxieties"
          defaultValue={defaults.anxieties}
          placeholder="例：投資が無駄になること。社内に浸透しないこと"
        />
        <TextArea
          label="購買障壁（買わない理由）"
          name="buyingBarriers"
          defaultValue={defaults.buyingBarriers}
          placeholder="例：過去のツール導入失敗。費用対効果が見えない"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea
            label="既存の代替手段"
            name="alternatives"
            rows={2}
            defaultValue={defaults.alternatives}
            placeholder="例：ITに強い社員に任せている"
          />
          <TextArea
            label="情報収集の方法"
            name="infoSources"
            rows={2}
            defaultValue={defaults.infoSources}
            placeholder="例：X・YouTube・経営者仲間の口コミ"
          />
        </div>
      </Section>

      <Section
        step="WHAT"
        title="何を提供するか"
        description="提供価値と、競合ではなくあなたを選ぶ理由（USP）を言語化します。"
      >
        <TextArea
          label="提供価値"
          name="value"
          defaultValue={defaults.value}
          placeholder="例：AIツールの導入で終わらせず、現場に定着するまで伴走する"
        />
        <TextArea
          label="商品・サービス"
          name="products"
          defaultValue={defaults.products}
          placeholder="例：AI導入支援（3ヶ月）／定着レビュー顧問（月次）"
        />
        <TextArea
          label="USP（独自の強み）"
          name="usp"
          defaultValue={defaults.usp}
          placeholder="例：ツール紹介ではなく「やめる業務を決める」から入る定着メソッド"
        />
      </Section>

      <Section
        step="WHY"
        title="なぜ自分なのか"
        description="実績・専門性・独自性。信頼の根拠になり、投稿とプロフィールの説得力を作ります。"
      >
        <TextArea
          label="実績"
          name="achievements"
          defaultValue={defaults.achievements}
          placeholder="例：中小企業30社の導入支援。平均で月20時間の業務削減"
        />
        <TextArea
          label="専門性"
          name="expertise"
          defaultValue={defaults.expertise}
          placeholder="例：製造業・士業向けの業務改善が専門"
        />
        <TextArea
          label="独自性"
          name="uniqueness"
          defaultValue={defaults.uniqueness}
          placeholder="例：自社でも失敗経験があり、失敗パターンを言語化できる"
        />
      </Section>

      <Section
        step="HOW"
        title="どう伝えるか"
        description="発信トーン・コンテンツの柱・動線の方針。詳細な柱の比率はCONTENT PILLARSで設計します。"
      >
        <TextArea
          label="発信トーン"
          name="tone"
          rows={2}
          defaultValue={defaults.tone}
          placeholder="例：経営者目線・実例ベース・誇張しない"
        />
        <TextArea
          label="コンテンツの柱（案）"
          name="pillars"
          rows={2}
          defaultValue={defaults.pillars}
          placeholder="例：導入事例／業務改善ノウハウ／経営の考え方"
        />
        <TextArea
          label="動線設計（案）"
          name="funnelIdea"
          rows={2}
          defaultValue={defaults.funnelIdea}
          placeholder="例：X → 無料資料 → メルマガ → 無料相談 → 支援契約"
        />
      </Section>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton>マーケティング戦略を保存</SubmitButton>
    </form>
  );
}
