"use client";

import { useState, useTransition } from "react";
import { reschedulePostAction } from "./actions";
import type { CalendarEntry, CalendarWeek } from "@/lib/calendar/service";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-brand-200 bg-brand-50 text-brand-800",
  posting: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "予約",
  posting: "投稿中",
  published: "投稿済み",
  failed: "失敗",
};

/**
 * 月/週カレンダーのグリッド (F-07)。
 * 予約 (青) は HTML5 Drag & Drop で別の日へ移動できる (時刻は維持)。
 */
export function CalendarGrid({
  weeks,
  entries,
  monthKey,
  todayKey,
}: {
  weeks: CalendarWeek[];
  entries: CalendarEntry[];
  /** YYYY-MM (この月以外のセルは薄く表示) */
  monthKey: string;
  todayKey: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.dateKey) ?? [];
    list.push(entry);
    byDate.set(entry.dateKey, list);
  }

  const handleDrop = (dateKey: string, event: React.DragEvent) => {
    event.preventDefault();
    setDragOverKey(null);
    const id = event.dataTransfer.getData("text/scheduled-post-id");
    if (!id) return;

    startTransition(async () => {
      const result = await reschedulePostAction(id, dateKey);
      setError(result.error);
    });
  };

  return (
    <div>
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div
        className={`overflow-x-auto rounded-xl border border-ink-200 bg-white shadow-sm ${isPending ? "opacity-60" : ""}`}
      >
        <div className="grid min-w-[840px] grid-cols-7 border-b border-ink-200 bg-ink-50 text-center text-xs font-medium text-ink-500">
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid min-w-[840px] grid-cols-7 divide-x divide-ink-100 border-b border-ink-100 last:border-b-0"
          >
            {week.dateKeys.map((dateKey) => {
              const inMonth = dateKey.startsWith(monthKey);
              const isToday = dateKey === todayKey;
              const dayEntries = byDate.get(dateKey) ?? [];

              return (
                <div
                  key={dateKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverKey(dateKey);
                  }}
                  onDragLeave={() =>
                    setDragOverKey((k) => (k === dateKey ? null : k))
                  }
                  onDrop={(e) => handleDrop(dateKey, e)}
                  className={`min-h-24 p-1.5 align-top transition ${
                    inMonth ? "bg-white" : "bg-ink-50/60"
                  } ${dragOverKey === dateKey ? "bg-brand-50 ring-2 ring-inset ring-brand-300" : ""}`}
                >
                  <p
                    className={`mb-1 text-right text-xs tabular-nums ${
                      isToday
                        ? "font-bold text-brand-700"
                        : inMonth
                          ? "text-ink-600"
                          : "text-ink-300"
                    }`}
                  >
                    {isToday ? "今日 " : ""}
                    {Number(dateKey.slice(8))}
                  </p>

                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.scheduledPostId}
                        draggable={entry.movable}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "text/scheduled-post-id",
                            entry.scheduledPostId,
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        title={`${entry.timeLabel} @${entry.handle}\n${entry.text}`}
                        className={`rounded border px-1.5 py-1 text-[11px] leading-tight ${STATUS_STYLES[entry.status] ?? ""} ${
                          entry.movable ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      >
                        <span className="font-semibold tabular-nums">
                          {entry.timeLabel}
                        </span>
                        <span className="ml-1 rounded bg-white/60 px-1 text-[10px]">
                          {STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                        <p className="mt-0.5 line-clamp-2">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-400">
        「予約」の投稿はドラッグ&ドロップで別の日に移動できます（時刻は維持されます）。投稿済み・失敗は移動できません。
      </p>
    </div>
  );
}
