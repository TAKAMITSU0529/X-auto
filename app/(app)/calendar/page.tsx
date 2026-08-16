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
import { getPlannedIdeas } from "@/lib/plan/service";
import {
  DataNote,
  NextActionButton,
  PageHeader,
} from "@/components/ui";
import { CalendarGrid } from "./calendar-grid";
import { PlanForm } from "./plan-form";

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

  const [entries, ideas, insights, pillarReport] = await Promise.all([
    getCalendarEntries({ userId, from, to }),
    getPlannedIdeas({
      userId,
      firstDateKey: weeks[0].dateKeys[0],
      lastDateKey: weeks[weeks.length - 1].dateKeys[6],
    }),
    computePerformanceInsights(userId),
    computePillarBalance(userId),
  ]);

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const navButton =
    "inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 shadow-xs transition duration-200 hover:border-ink-300 hover:bg-ink-50";
  const navButtonActive =
    "border-brand-500 bg-brand-50 text-brand-700 hover:border-brand-500 hover:bg-brand-50";

  return (
    <>
      <PageHeader
        eyebrow="作る・出す"
        title="カレンダー"
        description="予約・投稿済みをカレンダーで俯瞰します。予約はドラッグ&ドロップで日付を変更できます。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/calendar?m=${prev}${isWeekView ? "&view=week" : ""}`}
              className={navButton}
            >
              ← 前月
            </Link>
            <span className="min-w-[6.5rem] text-center text-[13px] font-semibold tabular-nums text-ink-900">
              {year}年{month}月
            </span>
            <Link
              href={`/calendar?m=${next}${isWeekView ? "&view=week" : ""}`}
              className={navButton}
            >
              翌月 →
            </Link>
            <span className="mx-1 h-5 w-px bg-ink-200" />
            <Link
              href={`/calendar?m=${monthKey}`}
              aria-current={!isWeekView ? "page" : undefined}
              className={`${navButton} ${!isWeekView ? navButtonActive : ""}`}
            >
              月
            </Link>
            <Link
              href={`/calendar?m=${monthKey}&view=week`}
              aria-current={isWeekView ? "page" : undefined}
              className={`${navButton} ${isWeekView ? navButtonActive : ""}`}
            >
              週
            </Link>
          </div>
        }
      />

      <div className="mb-5 space-y-2">
        {insights.best.daySlot ? (
          <DataNote>
            あなたの実績では <strong>{insights.best.daySlot}</strong>（日本時間）
            の投稿の平均エンゲージメント率が最も高くなっています（
            <span className="tabular-nums">{insights.sampleSize}</span>
            件の実測から）。この時間帯への予約がおすすめです。
          </DataNote>
        ) : (
          <DataNote>
            投稿実績が蓄積されると、実績に基づくおすすめ投稿時間帯がここに表示されます。
          </DataNote>
        )}

        {pillarReport?.mostLacking ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-amber-900">
              CONTENT PILLARS で最も不足しているテーマは
              <strong className="mx-1">「{pillarReport.mostLacking.name}」</strong>
              です（目標比{" "}
              <span className="tabular-nums">{pillarReport.mostLacking.gap}</span>
              pt 不足）。次の予約はこのテーマがおすすめです。
            </p>
            <NextActionButton
              href={`/generate?genre=${encodeURIComponent(pillarReport.mostLacking.name)}`}
            >
              このテーマで3案生成 →
            </NextActionButton>
          </div>
        ) : null}
      </div>

      <div className="mb-5">
        <PlanForm defaultStartDate={todayKey} />
      </div>

      <CalendarGrid
        weeks={weeks}
        entries={entries}
        ideas={ideas}
        monthKey={monthKey}
        todayKey={todayKey}
      />

      <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
        新しい予約は{" "}
        <Link
          href="/schedule"
          className="font-semibold text-brand-700 underline underline-offset-2 transition duration-200 hover:text-brand-800"
        >
          予約投稿
        </Link>{" "}
        から作成します（下書き → 日時指定）。
      </p>
    </>
  );
}
