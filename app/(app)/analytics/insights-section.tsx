import type { PerformanceInsights } from "@/lib/analytics/insights";
import { DAY_LABELS, SLOT_LABELS } from "@/lib/analytics/insights";
import { Card, DataNote, formatPercent } from "@/components/ui";

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
        以下は自分の投稿 {insights.sampleSize} 件の実測値の集計です（書き出し・形式の分類は機械判定、時刻は日本時間）。
        サンプルが少ないバケツは平均が振れやすいため、件数を必ず確認してください。
      </DataNote>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            HOOK ANALYSIS — 書き出し別の平均ER
          </h2>
          <BucketTable rows={insights.byHook} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            POST FORMAT — 投稿形式別の平均ER
          </h2>
          <BucketTable rows={insights.byFormat} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          TIME ANALYSIS — 曜日 × 時間帯ヒートマップ（日本時間）
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] text-xs">
            <thead>
              <tr>
                <th className="w-12 pb-1.5"></th>
                {SLOT_LABELS.map((label) => (
                  <th
                    key={label}
                    className="pb-1.5 text-center font-medium text-ink-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((dayLabel, day) => (
                <tr key={day}>
                  <td className="pr-2 text-right font-medium text-ink-500">
                    {dayLabel}
                  </td>
                  {SLOT_LABELS.map((_, slot) => {
                    const cell = insights.heatmap.find(
                      (c) => c.day === day && c.slot === slot,
                    );
                    const intensity = cell
                      ? Math.min(1, cell.avgEngagementRate / maxEr)
                      : 0;
                    return (
                      <td key={slot} className="p-0.5">
                        <div
                          className="flex h-9 items-center justify-center rounded tabular-nums"
                          style={{
                            backgroundColor: cell
                              ? `rgba(47, 125, 225, ${0.12 + intensity * 0.75})`
                              : "#f2f4f7",
                            color: intensity > 0.55 ? "#fff" : "#45505f",
                          }}
                          title={
                            cell
                              ? `${dayLabel}曜 ${SLOT_LABELS[slot]}: ER ${formatPercent(cell.avgEngagementRate)} (${cell.count}件)`
                              : "投稿なし"
                          }
                        >
                          {cell ? formatPercent(cell.avgEngagementRate, 1) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          色が濃いほど平均エンゲージメント率が高い時間帯です。BEST POST TIME:{" "}
          {insights.best.daySlot ?? "サンプル不足"}
        </p>
      </Card>
    </div>
  );
}

function BucketTable({
  rows,
}: {
  rows: { label: string; count: number; avgEngagementRate: number }[];
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-xs text-ink-400">データなし</p>;
  }
  const max = Math.max(...rows.map((r) => r.avgEngagementRate), 0.0001);

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-ink-700">{row.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-ink-100">
            <div
              className="h-full rounded bg-brand-500"
              style={{
                width: `${Math.max(3, (row.avgEngagementRate / max) * 100)}%`,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-ink-800">
            {formatPercent(row.avgEngagementRate)}
          </span>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-400">
            {row.count}件
          </span>
        </li>
      ))}
    </ul>
  );
}
