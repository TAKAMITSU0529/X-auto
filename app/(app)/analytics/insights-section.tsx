import type { PerformanceInsights } from "@/lib/analytics/insights";
import { DAY_LABELS, SLOT_LABELS } from "@/lib/analytics/insights";
import {
  Card,
  CardHeader,
  DataNote,
  MeterBar,
  NextActionButton,
  formatPercent,
} from "@/components/ui";

/**
 * F-10 拡張分析: HOOK別・形式別・曜日×時間帯の成績 (Learning Loop 初版)。
 * ルールベース分類 × 実測ERの集計なので DATA として表示する。
 */
export function InsightsSection({
  insights,
}: {
  insights: PerformanceInsights;
}) {
  if (insights.sampleSize === 0) return null;

  const maxEr = Math.max(
    0.0001,
    ...insights.heatmap.map((c) => c.avgEngagementRate),
  );

  return (
    <div className="space-y-6">
      <DataNote>
        以下は自分の投稿 <span className="tabular-nums">{insights.sampleSize}</span>{" "}
        件の実測値の集計です（書き出し・形式の分類は機械判定、時刻は日本時間）。
        サンプルが少ないバケツは平均が振れやすいため、件数を必ず確認してください。
      </DataNote>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="HOOK ANALYSIS — 書き出し別の平均ER"
            description="書き出しのパターン別に、実測エンゲージメント率を比較します。"
            action={
              insights.best.hook ? (
                <NextActionButton href="/generate">
                  この書き出しで生成する
                </NextActionButton>
              ) : undefined
            }
          />
          <BucketTable rows={insights.byHook} best={insights.best.hook} />
        </Card>

        <Card>
          <CardHeader
            title="POST FORMAT — 投稿形式別の平均ER"
            description="箇条書き・短文・中文・長文の別に実測ERを比較します。"
          />
          <BucketTable rows={insights.byFormat} best={insights.best.format} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="TIME ANALYSIS — 曜日 × 時間帯ヒートマップ（日本時間）"
          description="セルの上段が平均エンゲージメント率、下段が投稿件数です。"
          action={
            insights.best.daySlot ? (
              <NextActionButton href="/schedule">
                この時間帯で予約する
              </NextActionButton>
            ) : undefined
          }
        />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            BEST POST TIME:{" "}
            <span className="text-ink-900">
              {insights.best.daySlot ?? "サンプル不足"}
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
            <span>低</span>
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <span
                key={step}
                aria-hidden="true"
                className="h-3 w-6 rounded-sm ring-1 ring-inset ring-ink-200/70"
                style={{ backgroundColor: heatColor(step) }}
              />
            ))}
            <span>高（平均ER）</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[680px] text-xs">
            <thead>
              <tr>
                <th className="w-10 pb-1.5"></th>
                {SLOT_LABELS.map((label) => (
                  <th
                    key={label}
                    className="pb-1.5 text-center text-[11px] font-medium tabular-nums text-ink-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((dayLabel, day) => (
                <tr key={day}>
                  <td className="pr-2 text-right text-[11px] font-semibold text-ink-600">
                    {dayLabel}
                  </td>
                  {SLOT_LABELS.map((_, slot) => {
                    const cell = insights.heatmap.find(
                      (c) => c.day === day && c.slot === slot,
                    );
                    const intensity = cell
                      ? Math.min(1, cell.avgEngagementRate / maxEr)
                      : 0;
                    const light = intensity > 0.55;
                    return (
                      <td key={slot} className="p-0.5">
                        <div
                          className="flex h-11 flex-col items-center justify-center rounded-lg ring-1 ring-inset ring-ink-200/60 tabular-nums"
                          style={{
                            backgroundColor: cell ? heatColor(intensity) : "#f8f9fc",
                            color: light ? "#fff" : "#39424f",
                          }}
                          title={
                            cell
                              ? `${dayLabel}曜 ${SLOT_LABELS[slot]}: ER ${formatPercent(cell.avgEngagementRate)} (${cell.count}件)`
                              : "投稿なし"
                          }
                        >
                          {cell ? (
                            <>
                              <span className="text-[12px] font-bold leading-none">
                                {formatPercent(cell.avgEngagementRate, 1)}
                              </span>
                              <span
                                className="mt-0.5 text-[10px] leading-none"
                                style={{
                                  color: light
                                    ? "rgba(255,255,255,0.75)"
                                    : "#98a4b8",
                                }}
                              >
                                {cell.count}件
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-ink-300">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          色が濃いほど平均エンゲージメント率が高い時間帯です。「—」はその時間帯に投稿がないことを示します。
        </p>
      </Card>
    </div>
  );
}

/** ヒートマップの色 (brand-600 の濃度で表現する) */
function heatColor(intensity: number): string {
  return `rgba(43, 79, 230, ${(0.1 + intensity * 0.78).toFixed(3)})`;
}

function BucketTable({
  rows,
  best,
}: {
  rows: { label: string; count: number; avgEngagementRate: number }[];
  /** 実績上「伸びる」と判定された値 (サンプル2件以上) */
  best?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-300 bg-ink-25 py-6 text-center text-xs text-ink-400">
        データなし — 投稿が記録されると集計されます
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.avgEngagementRate), 0.0001);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const isBest = Boolean(best) && row.label === best;
        return (
          <li key={row.label} className="flex items-center gap-3 text-[13px]">
            <span
              className={`w-24 shrink-0 truncate ${
                isBest ? "font-semibold text-ink-900" : "text-ink-700"
              }`}
              title={row.label}
            >
              {row.label}
            </span>
            <MeterBar
              ratio={row.avgEngagementRate / max}
              tone={isBest ? "brand" : "ink"}
              className="flex-1"
            />
            <span
              className={`w-16 shrink-0 text-right text-xs tabular-nums ${
                isBest ? "font-bold text-brand-700" : "text-ink-800"
              }`}
            >
              {formatPercent(row.avgEngagementRate)}
            </span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-400">
              {row.count}件
            </span>
          </li>
        );
      })}
    </ul>
  );
}
