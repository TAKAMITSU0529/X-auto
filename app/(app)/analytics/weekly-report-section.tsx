"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { WeeklyReportResult } from "@/lib/ai";
import {
  generateWeeklyReportAction,
  type WeeklyReportState,
} from "./report-actions";
import { FormError, Spinner } from "@/components/form";
import {
  Card,
  CardHeader,
  EmptyState,
  HypothesisNote,
  Tag,
} from "@/components/ui";

const initialState: WeeklyReportState = { error: null, report: null };

/**
 * 週次AIレポート + NEXT BEST ACTION (F-20)。
 * サーバーに保存済みの最新レポートを初期表示し、ボタンで再生成できる。
 */
export function WeeklyReportSection({
  latest,
}: {
  latest: {
    createdAt: string;
    report: WeeklyReportResult;
  } | null;
}) {
  const [state, formAction] = useActionState(
    generateWeeklyReportAction,
    initialState,
  );

  const report = state.report ?? latest?.report ?? null;

  return (
    <Card>
      <CardHeader
        title="AI GROWTH COACH — 週次レポート"
        description="直近7日の実測値をもとに、AIが総括と次の一手を出します。"
        action={
          <form action={formAction}>
            <ReportSubmit hasReport={Boolean(report)} />
          </form>
        }
      />

      <FormError message={state.error} />

      {!report ? (
        <EmptyState
          title="まだレポートがありません"
          description="「レポートを生成」を押すと、直近7日の実績から総括と次のアクションを生成します。"
        />
      ) : (
        <div className="space-y-4">
          <HypothesisNote>{report.summary}</HypothesisNote>

          <div className="grid gap-4 sm:grid-cols-3">
            <ReportList title="ハイライト" items={report.highlights} tone="ink" />
            <ReportList title="来週増やす" items={report.increase} tone="emerald" />
            <ReportList title="減らす" items={report.decrease} tone="rose" />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
              <Tag tone="action">ACTION</Tag>
              NEXT BEST ACTION — 次にやること
            </p>
            <ol className="list-inside list-decimal space-y-1.5 text-[13px] leading-relaxed text-emerald-900">
              {report.nextActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          </div>

          {latest && !state.report ? (
            <p className="text-xs tabular-nums text-ink-400">
              生成日時: {new Date(latest.createdAt).toLocaleString("ja-JP")}
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function ReportList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ink" | "emerald" | "rose";
}) {
  const toneClass = {
    ink: "text-ink-600",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
  }[tone];

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-25 p-3.5">
      <p
        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] ${toneClass}`}
      >
        {title}
      </p>
      <ul className="space-y-1.5 text-xs leading-relaxed text-ink-700">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span
              aria-hidden="true"
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-300"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportSubmit({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-xs transition duration-200 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Spinner />
          生成中...
        </>
      ) : hasReport ? (
        "レポートを再生成"
      ) : (
        "レポートを生成"
      )}
    </button>
  );
}
