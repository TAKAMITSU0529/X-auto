import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import {
  buildMonthGrid,
  getCalendarEntries,
  jstRangeToUtc,
  todayKeyJst,
  toJst,
} from "@/lib/calendar/service";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { computePillarBalance } from "@/lib/pillars/service";
import {
  DataNote,
  NextActionButton,
  PageHeader,
} from "@/components/ui";
import { CalendarGrid } from "./calendar-grid";

/**
 * コンテンツカレンダー (F-07【A】)。
 * 月・週表示、D&Dでの日時変更、おすすめ時間帯サジェスト (F-10 実績)、
 * CONTENT PILLARS (F-18) の不足テーマの反映。
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; view?: string }>;
}) {
  const userId = await requireUserId();
  const { m, view } = await searchParams;

  // 表示する月 (JST)。?m=YYYY-MM で移動
  const nowJst = toJst(new Date());
  const matched = m?.match(/^(\d{4})-(\d{2})$/);
  const year = matched ? Number(matched[1]) : nowJst.getUTCFullYear();
  const month = matched ? Number(matched[2]) : nowJst.getUTCMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const todayKey = todayKeyJst();
  const isWeekView = view === "week";

  let weeks = buildMonthGrid(year, month);
  if (isWeekView) {
    // 週表示: 今日を含む週があればそれ、無ければ先頭の週
    weeks = [
      weeks.find((w) => w.dateKeys.includes(todayKey)) ?? weeks[0],
    ];
  }

  const { from, to } = jstRangeToUtc(
    weeks[0].dateKeys[0],
    weeks[weeks.length - 1].dateKeys[6],
  );

  const [entries, insights, pillarReport] = await Promise.all([
    getCalendarEntries({ userId, from, to }),
    computePerformanceInsights(userId),
    computePillarBalance(userId),
  ]);

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const navButton =
    "rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50";

  return (
    <>
      <PageHeader
        title="カレンダー"
        description="予約・投稿済みをカレンダーで俯瞰します。予約はドラッグ&ドロップで日付を変更できます。"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?m=${prev}${isWeekView ? "&view=week" : ""}`} className={navButton}>
              ← 前月
            </Link>
            <span className="text-sm font-semibold tabular-nums text-ink-900">
              {year}年{month}月
            </span>
            <Link href={`/calendar?m=${next}${isWeekView ? "&view=week" : ""}`} className={navButton}>
              翌月 →
            </Link>
            <span className="mx-1 h-5 w-px bg-ink-200" />
            <Link
              href={`/calendar?m=${monthKey}`}
              className={`${navButton} ${!isWeekView ? "border-brand-500 bg-brand-50 text-brand-700" : ""}`}
            >
              月
            </Link>
            <Link
              href={`/calendar?m=${monthKey}&view=week`}
              className={`${navButton} ${isWeekView ? "border-brand-500 bg-brand-50 text-brand-700" : ""}`}
            >
              週
            </Link>
          </div>
        }
      />

      <div className="mb-4 space-y-2">
        {insights.best.daySlot ? (
          <DataNote>
            あなたの実績では <strong>{insights.best.daySlot}</strong>（日本時間）
            の投稿の平均エンゲージメント率が最も高くなっています（{insights.sampleSize}件の実測から）。この時間帯への予約がおすすめです。
          </DataNote>
        ) : (
          <DataNote>
            投稿実績が蓄積されると、実績に基づくおすすめ投稿時間帯がここに表示されます。
          </DataNote>
        )}

        {pillarReport?.mostLacking ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-sm text-amber-900">
              CONTENT PILLARS で最も不足しているテーマは
              <strong className="mx-1">「{pillarReport.mostLacking.name}」</strong>
              です（目標比 {pillarReport.mostLacking.gap}pt 不足）。次の予約はこのテーマがおすすめです。
            </p>
            <NextActionButton
              href={`/generate?genre=${encodeURIComponent(pillarReport.mostLacking.name)}`}
            >
              このテーマで3案生成 →
            </NextActionButton>
          </div>
        ) : null}
      </div>

      <CalendarGrid
        weeks={weeks}
        entries={entries}
        monthKey={monthKey}
        todayKey={todayKey}
      />

      <p className="mt-4 text-sm text-ink-500">
        新しい予約は{" "}
        <Link href="/schedule" className="font-medium text-brand-700 underline">
          予約投稿
        </Link>{" "}
        から作成します（下書き → 日時指定）。
      </p>
    </>
  );
}
