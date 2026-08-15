"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { WeeklyReportResult } from "@/lib/ai";
import {
  generateWeeklyReportAction,
  type WeeklyReportState,
} from "./report-actions";
import { FormError } from "@/components/form";

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
    <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">
          AI GROWTH COACH — 週次レポート
        </h2>
        <form action={formAction}>
          <ReportSubmit hasReport={Boolean(report)} />
        </form>
      </div>

      <FormError message={state.error} />

      {!report ? (
        <p className="py-6 text-center text-sm text-ink-500">
          まだレポートがありません。「レポートを生成」を押すと、直近7日の実績から総括と次のアクションを生成します。
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5">
            <span className="mr-2 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
              AI推定
            </span>
            <span className="text-sm text-violet-900">{report.summary}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <ReportList title="ハイライト" items={report.highlights} tone="ink" />
            <ReportList title="来週増やす" items={report.increase} tone="emerald" />
            <ReportList title="減らす" items={report.decrease} tone="red" />
          </div>

          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              NEXT BEST ACTION — 次にやること
            </p>
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-ink-800">
              {report.nextActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          </div>

          {latest && !state.report ? (
            <p className="text-xs text-ink-400">
              生成日時: {new Date(latest.createdAt).toLocaleString("ja-JP")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReportList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ink" | "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
        ? "text-red-700"
        : "text-ink-700";
  return (
    <div>
      <p className={`mb-1.5 text-xs font-semibold ${toneClass}`}>{title}</p>
      <ul className="list-inside list-disc space-y-1 text-xs text-ink-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
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
      className="rounded-lg border border-violet-300 bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-200 disabled:opacity-60"
    >
      {pending
        ? "生成中..."
        : hasReport
          ? "レポートを再生成"
          : "レポートを生成"}
    </button>
  );
}
