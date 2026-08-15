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
  DataNote,
  NextActionButton,
  PageHeader,
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
        title="CONTENT PILLARS"
        description="発信テーマの柱と投稿比率を設計します。実際の投稿とのズレを可視化し、不足している柱はワンクリックで投稿生成へつなげられます。"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <PillarsForm rows={rows} purposes={purposes} />
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-ink-900">
              実際の投稿比率とのズレ
            </h2>

            {!report ? (
              <p className="mt-3 text-sm text-ink-500">
                まず左のフォームで柱を設定してください。
              </p>
            ) : report.totalPosts === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                自己投稿のデータがまだありません。X連携して投稿すると、直近の投稿が自動で柱に分類され、ここにズレが表示されます。
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                <DataNote>
                  直近{report.totalPosts}件の自己投稿をキーワード一致で分類した実測比率です（未分類 {report.unclassified} 件は母数から除外）。
                </DataNote>

                <div className="space-y-3">
                  {report.balances.map((b) => (
                    <div key={b.name}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium text-ink-900">
                          {b.name}
                        </span>
                        <span className="text-xs text-ink-500">
                          目標 {b.targetRatio}% / 実際 {b.actualRatio}%（
                          {b.postCount}件）
                          {b.gap > 0 ? (
                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                              {b.gap}pt 不足
                            </span>
                          ) : b.gap < 0 ? (
                            <span className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-600">
                              {-b.gap}pt 過多
                            </span>
                          ) : (
                            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              一致
                            </span>
                          )}
                        </span>
                      </div>
                      {/* 目標 (薄) と実際 (濃) の2本バー */}
                      <div className="relative h-3 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
                          style={{ width: `${Math.min(100, b.targetRatio)}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-600/80"
                          style={{ width: `${Math.min(100, b.actualRatio)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {report.mostLacking ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-sm text-amber-900">
                      最も不足しているのは
                      <strong className="mx-1">
                        「{report.mostLacking.name}」
                      </strong>
                      です（目標より {report.mostLacking.gap}pt 少ない）。
                    </p>
                    <div className="mt-2">
                      <NextActionButton
                        href={`/generate?genre=${encodeURIComponent(report.mostLacking.name)}`}
                      >
                        このテーマで3案生成する →
                      </NextActionButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700">
                    すべての柱が目標比率を満たしています。
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-900">目的別の設計</h2>
            <p className="mt-1 text-xs text-ink-500">
              投稿を作るときは「この投稿はどの目的か」を意識してください。生成スタジオの「投稿の目的」「ターゲット段階」と対応します。
            </p>
            <div className="mt-3 space-y-1.5">
              {purposes.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-sm">
                  <span className="w-56 shrink-0 text-ink-700">{p.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, p.ratio)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-ink-500">
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
