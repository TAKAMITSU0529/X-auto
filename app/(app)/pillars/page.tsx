import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  MAX_PILLARS,
  PURPOSE_DEFS,
  computePillarBalance,
  type Pillar,
  type PurposeRatios,
} from "@/lib/pillars/service";
import {
  Card,
  CardHeader,
  DataNote,
  EmptyState,
  LinkButton,
  MeterBar,
  NextActionButton,
  PageHeader,
  Tag,
} from "@/components/ui";
import {
  PillarsForm,
  type PillarRowDefault,
  type PurposeDefault,
} from "./pillars-form";

/**
 * CONTENT PILLARS・投稿比率設計 (F-18)。
 * 柱と目標比率を設計し、実際の自己投稿の比率とのズレを表示する。
 * 分類はキーワード一致のルールベース (DATA 扱い・追加AIコスト0)。
 */
export default async function PillarsPage() {
  const userId = await requireUserId();

  const setting = await prisma.contentPillarSetting.findUnique({
    where: { userId },
  });
  const pillars = (setting?.pillarsJson ?? []) as unknown as Pillar[];
  const purposeRatios = (setting?.purposeRatioJson ?? {}) as PurposeRatios;

  const rows: PillarRowDefault[] = Array.from(
    { length: MAX_PILLARS },
    (_, i) => ({
      name: pillars[i]?.name ?? "",
      ratio: pillars[i]?.ratio ?? 0,
      keywords: (pillars[i]?.keywords ?? []).join(", "),
    }),
  );

  const purposes: PurposeDefault[] = PURPOSE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    ratio: purposeRatios[def.key] ?? def.defaultRatio,
  }));

  const report = setting ? await computePillarBalance(userId) : null;

  return (
    <>
      <PageHeader
        eyebrow="戦略を決める"
        title="CONTENT PILLARS"
        description="発信テーマの柱と投稿比率を設計します。実際の投稿とのズレを可視化し、不足している柱はワンクリックで投稿生成へつなげられます。"
      />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card>
          <PillarsForm rows={rows} purposes={purposes} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="実際の投稿比率とのズレ"
              description="キーワード一致のルールベース分類なので、追加のAIコストは掛かりません。"
              action={<Tag tone="data">DATA</Tag>}
            />

            {!report ? (
              <EmptyState
                title="まだ柱を設定していません"
                description="まず左のフォームで柱を設定してください。保存すると、直近の自己投稿が自動で柱に分類され、ここに目標比率とのズレが表示されます。"
              />
            ) : report.totalPosts === 0 ? (
              <EmptyState
                title="自己投稿のデータがまだありません"
                description="X連携して投稿すると、直近の投稿が自動で柱に分類され、ここにズレが表示されます。"
                action={
                  <LinkButton href="/settings" variant="secondary" size="sm">
                    X連携の設定へ
                  </LinkButton>
                }
              />
            ) : (
              <div className="space-y-4">
                <DataNote>
                  直近{report.totalPosts}件の自己投稿をキーワード一致で分類した実測比率です（未分類{" "}
                  {report.unclassified} 件は母数から除外）。
                </DataNote>

                <div className="space-y-4">
                  {report.balances.map((b) => (
                    <div key={b.name}>
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <span className="text-[13px] font-medium text-ink-900">
                          {b.name}
                        </span>
                        <span className="text-xs tabular-nums text-ink-500">
                          目標 {b.targetRatio}% / 実際 {b.actualRatio}%（
                          {b.postCount}件）
                          {b.gap > 0 ? (
                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-700">
                              {b.gap}pt 不足
                            </span>
                          ) : b.gap < 0 ? (
                            <span className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink-600">
                              {-b.gap}pt 過多
                            </span>
                          ) : (
                            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              一致
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 目標 (設計値) と実際 (実測値) を2本のバーで比べる */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                            目標
                          </span>
                          <MeterBar
                            className="flex-1"
                            ratio={b.targetRatio / 100}
                            tone="ink"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                            実際
                          </span>
                          <MeterBar
                            className="flex-1"
                            ratio={b.actualRatio / 100}
                            tone={b.gap > 0 ? "amber" : "brand"}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {report.mostLacking ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                    <p className="text-[13px] leading-relaxed text-amber-900">
                      最も不足しているのは
                      <strong className="mx-1">
                        「{report.mostLacking.name}」
                      </strong>
                      です（目標より{" "}
                      <span className="tabular-nums">
                        {report.mostLacking.gap}pt
                      </span>{" "}
                      少ない）。
                    </p>
                    <div className="mt-2.5">
                      <NextActionButton
                        href={`/generate?genre=${encodeURIComponent(report.mostLacking.name)}`}
                      >
                        このテーマで3案生成する
                      </NextActionButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-emerald-700">
                    すべての柱が目標比率を満たしています。
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="目的別の設計"
              description="投稿を作るときは「この投稿はどの目的か」を意識してください。生成スタジオの「投稿の目的」「ターゲット段階」と対応します。"
            />
            <div className="space-y-2">
              {purposes.map((p) => (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="w-56 shrink-0 text-[13px] text-ink-700">
                    {p.label}
                  </span>
                  <MeterBar className="flex-1" ratio={p.ratio / 100} />
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-500">
                    {p.ratio}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
