import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { Card, HypothesisNote, PageHeader } from "@/components/ui";
import type {
  CustomerInsightResult,
  PlaybookResult,
} from "@/lib/ai";
import { StrategyForm, type StrategyDefaults } from "./strategy-form";
import { InsightRunner, PlaybookRunner } from "./ai-panels";

/**
 * マーケティング戦略AI (F-09)。
 * WHO/WHAT/WHY/HOW の設定ウィザードと、CUSTOMER INSIGHT・
 * MARKETING PLAYBOOK の生成。投稿生成 (F-05/F-06) はこの設定を常に参照する。
 */
export default async function StrategyPage() {
  const userId = await requireUserId();

  const strategy = await prisma.marketingStrategy.findUnique({
    where: { userId },
  });

  const j = (json: unknown) => (json ?? {}) as Record<string, string | null>;
  const who = j(strategy?.whoJson);
  const what = j(strategy?.whatJson);
  const why = j(strategy?.whyJson);
  const how = j(strategy?.howJson);

  const defaults: StrategyDefaults = {
    industry: who.industry ?? "",
    ageRange: who.ageRange ?? "",
    role: who.role ?? "",
    companySize: who.companySize ?? "",
    problems: who.problems ?? "",
    desires: who.desires ?? "",
    anxieties: who.anxieties ?? "",
    buyingBarriers: who.buyingBarriers ?? "",
    alternatives: who.alternatives ?? "",
    infoSources: who.infoSources ?? "",
    value: what.value ?? "",
    products: what.products ?? "",
    usp: what.usp ?? "",
    achievements: why.achievements ?? "",
    expertise: why.expertise ?? "",
    uniqueness: why.uniqueness ?? "",
    tone: how.tone ?? "",
    pillars: how.pillars ?? "",
    funnelIdea: how.funnelIdea ?? "",
  };

  const insight = strategy?.insightJson as CustomerInsightResult | null;
  const playbook = strategy?.playbookJson as PlaybookResult | null;

  return (
    <>
      <PageHeader
        title="マーケティング戦略"
        description="「誰に・何を・なぜ自分が・どう伝えるか」を設計します。投稿生成はこの設定を常に参照し、発信がぶれなくなります。"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <StrategyForm defaults={defaults} />
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink-900">
              CUSTOMER INSIGHT
            </h2>
            <p className="mt-1 mb-4 text-xs text-ink-500">
              ターゲットが言葉にしていない本音をAIが仮説化します。心理の推定であり事実ではないため、必ず仮説として扱ってください。
            </p>

            {insight ? (
              <div className="mb-4 space-y-3">
                <HypothesisNote>
                  以下はAIによるマーケティング仮説です。実際の顧客との対話で検証してください。
                </HypothesisNote>
                <dl className="space-y-2 text-sm">
                  {(
                    [
                      ["表面的課題", insight.surfaceProblem],
                      ["本当の課題", insight.realProblem],
                      ["感情", insight.emotions?.join("・")],
                      ["恐れている未来", insight.fearedFuture],
                      ["欲しい未来", insight.desiredFuture],
                      ["行動しない理由", insight.whyNotAct],
                      ["購入しない理由", insight.whyNotBuy],
                      ["信じている常識", insight.believedNorm],
                      ["壊すべき常識", insight.normToBreak],
                    ] as const
                  ).map(([label, value]) =>
                    value ? (
                      <div
                        key={label}
                        className="rounded-lg border border-ink-100 px-3 py-2"
                      >
                        <dt className="text-xs font-semibold text-ink-500">
                          {label}
                        </dt>
                        <dd className="mt-0.5 text-ink-800">{value}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </div>
            ) : null}

            <InsightRunner hasInsight={Boolean(insight)} />
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-900">
              MARKETING PLAYBOOK
            </h2>
            <p className="mt-1 mb-4 text-xs text-ink-500">
              顧客中心マーケティングの原則（USP・リスクリバーサル・LTV・オファー等）を、あなたのX運用向けの具体策に変換します。
            </p>

            {playbook ? (
              <div className="mb-4 space-y-4">
                <HypothesisNote>
                  PLAYBOOK はAIによるマーケティング仮説です。成果を保証するものではありません。
                </HypothesisNote>

                <div className="space-y-2">
                  {playbook.advices?.map((a) => (
                    <div
                      key={a.area}
                      className="rounded-lg border border-ink-100 px-3 py-2 text-sm"
                    >
                      <p className="text-xs font-bold text-brand-700">{a.area}</p>
                      <p className="mt-0.5 text-ink-800">{a.advice}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        <span className="mr-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                          ACTION
                        </span>
                        {a.action}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold text-ink-500">
                    リストマーケティング動線
                  </h3>
                  <ol className="space-y-1.5">
                    {playbook.funnel?.steps?.map((s, i) => (
                      <li key={s.label} className="flex gap-2 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                          {i + 1}
                        </span>
                        <span>
                          <span className="font-medium text-ink-900">
                            {s.label}
                          </span>
                          <span className="ml-2 text-xs text-ink-500">
                            {s.description}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  {playbook.funnel?.note ? (
                    <p className="mt-2 text-xs text-ink-500">
                      {playbook.funnel.note}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold text-ink-500">
                    CUSTOMER JOURNEY（投稿はこの段階に紐づけて作る）
                  </h3>
                  <div className="space-y-1.5">
                    {playbook.journey?.map((stage) => (
                      <div
                        key={stage.stage}
                        className="rounded-lg border border-ink-100 px-3 py-2 text-sm"
                      >
                        <p>
                          <span className="mr-2 rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-700">
                            {stage.stage}
                          </span>
                          <span className="text-ink-800">{stage.goal}</span>
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          投稿ヒント: {stage.postHint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <PlaybookRunner hasPlaybook={Boolean(playbook)} />
          </Card>
        </div>
      </div>
    </>
  );
}
