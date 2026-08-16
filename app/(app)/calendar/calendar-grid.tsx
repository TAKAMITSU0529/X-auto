"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteIdeaAction, reschedulePostAction } from "./actions";
import type { CalendarEntry, CalendarWeek } from "@/lib/calendar/service";
import type { PlannedIdea } from "@/lib/plan/service";
import { Card, CardHeader } from "@/components/ui";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 4状態は「色」と「文字ラベル」の両方で区別する (色覚に依存させない)。
 * box = 項目全体 / accent = 左端のバー / chip = 状態ラベル
 */
const STATUS_STYLES: Record<
  string,
  { box: string; accent: string; chip: string }
> = {
  scheduled: {
    box: "border-brand-200 bg-brand-50 text-brand-900",
    accent: "bg-brand-500",
    chip: "bg-brand-100 text-brand-800",
  },
  posting: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
  },
  published: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    accent: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800",
  },
  failed: {
    box: "border-rose-200 bg-rose-50 text-rose-800",
    accent: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
  },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "予約",
  posting: "投稿中",
  published: "投稿済み",
  failed: "失敗",
};

const LEGEND: { key: string; note: string }[] = [
  { key: "scheduled", note: "ドラッグで移動できます" },
  { key: "posting", note: "処理中" },
  { key: "published", note: "移動できません" },
  { key: "failed", note: "移動できません" },
];

/**
 * 月/週カレンダーのグリッド (F-07)。
 * 予約 (青) は HTML5 Drag & Drop で別の日へ移動できる (時刻は維持)。
 */
export function CalendarGrid({
  weeks,
  entries,
  ideas,
  monthKey,
  todayKey,
}: {
  weeks: CalendarWeek[];
  entries: CalendarEntry[];
  /** AUTO CONTENT PLAN (F-23) で配置された投稿アイデア */
  ideas: PlannedIdea[];
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

  const ideasByDate = new Map<string, PlannedIdea[]>();
  for (const idea of ideas) {
    const list = ideasByDate.get(idea.dateKey) ?? [];
    list.push(idea);
    ideasByDate.set(idea.dateKey, list);
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
    <Card>
      <CardHeader
        title="投稿カレンダー"
        description="状態は色と文字ラベルの両方で示しています。"
        action={
          isPending ? (
            <span className="text-xs font-medium text-ink-500">移動中...</span>
          ) : undefined
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {/* 凡例: 4状態 + 計画 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-500">
        {LEGEND.map(({ key, note }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-sm ${STATUS_STYLES[key].accent}`}
              aria-hidden="true"
            />
            <span className="font-semibold text-ink-700">
              {STATUS_LABELS[key]}
            </span>
            <span className="text-ink-400">{note}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-dashed border-ink-400 bg-ink-100"
            aria-hidden="true"
          />
          <span className="font-semibold text-ink-700">計画</span>
          <span className="text-ink-400">AUTO CONTENT PLAN のネタ</span>
        </span>
      </div>

      <div
        className={`overflow-x-auto rounded-xl border border-ink-200 transition duration-200 ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="grid min-w-[840px] grid-cols-7 border-b border-ink-200 bg-ink-50 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
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
            {week.dateKeys.map((dateKey, di) => {
              const inMonth = dateKey.startsWith(monthKey);
              const isToday = dateKey === todayKey;
              const isWeekend = di === 0 || di === 6;
              const dayEntries = byDate.get(dateKey) ?? [];
              const dayIdeas = ideasByDate.get(dateKey) ?? [];

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
                  className={`min-h-28 p-1.5 align-top transition duration-200 ${
                    inMonth
                      ? isWeekend
                        ? "bg-ink-25"
                        : "bg-white"
                      : "bg-ink-50/70"
                  } ${
                    dragOverKey === dateKey
                      ? "bg-brand-50 ring-2 ring-inset ring-brand-400"
                      : ""
                  }`}
                >
                  <p className="mb-1.5 flex items-center justify-end gap-1 text-right text-[11px] tabular-nums">
                    {isToday ? (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        今日
                      </span>
                    ) : null}
                    <span
                      className={
                        isToday
                          ? "font-bold text-brand-700"
                          : inMonth
                            ? "text-ink-600"
                            : "text-ink-300"
                      }
                    >
                      {Number(dateKey.slice(8))}
                    </span>
                  </p>

                  <div className="space-y-1">
                    {dayEntries.map((entry) => {
                      const style =
                        STATUS_STYLES[entry.status] ?? STATUS_STYLES.scheduled;
                      return (
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
                          title={`${entry.timeLabel} @${entry.handle}\n${entry.text}${
                            entry.movable ? "\n（ドラッグで別の日に移動できます）" : ""
                          }`}
                          className={`group relative overflow-hidden rounded-lg border py-1 pl-2.5 pr-1.5 text-[11px] leading-tight transition duration-200 ${style.box} ${
                            entry.movable
                              ? "cursor-grab hover:-translate-y-px hover:shadow-sm active:cursor-grabbing"
                              : ""
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-[3px] ${style.accent}`}
                          />
                          <span className="flex items-center gap-1">
                            <span className="font-bold tabular-nums">
                              {entry.timeLabel}
                            </span>
                            <span
                              className={`rounded px-1 py-px text-[10px] font-bold ${style.chip}`}
                            >
                              {STATUS_LABELS[entry.status] ?? entry.status}
                            </span>
                            {entry.movable ? (
                              <span className="ml-auto hidden text-[10px] font-medium opacity-70 group-hover:inline">
                                ドラッグで移動
                              </span>
                            ) : null}
                          </span>
                          <p className="mt-0.5 line-clamp-2">{entry.text}</p>
                        </div>
                      );
                    })}

                    {dayIdeas.map((idea) => (
                      <div
                        key={idea.generatedPostId}
                        title={`${idea.title}\n${idea.angle}`}
                        className="rounded-lg border border-dashed border-ink-300 bg-ink-50 px-2 py-1 text-[11px] leading-tight text-ink-600"
                      >
                        <span className="flex items-center gap-1">
                          <span className="rounded bg-ink-200 px-1 py-px text-[10px] font-bold text-ink-700">
                            計画
                          </span>
                          <span className="font-semibold tabular-nums">
                            {idea.time}
                          </span>
                        </span>
                        <p className="mt-0.5 line-clamp-2">{idea.title}</p>
                        <p className="mt-1 flex items-center gap-2">
                          <Link
                            href={`/generate?genre=${encodeURIComponent(idea.pillar)}&message=${encodeURIComponent(`${idea.title} — ${idea.angle}`)}`}
                            className="font-semibold text-brand-700 underline-offset-2 transition duration-200 hover:underline"
                          >
                            生成する
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("generatedPostId", idea.generatedPostId);
                              startTransition(async () => {
                                await deleteIdeaAction(fd);
                              });
                            }}
                            className="text-ink-400 transition duration-200 hover:text-rose-600"
                          >
                            削除
                          </button>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        「予約」の投稿はドラッグ&ドロップで別の日に移動できます（時刻は維持されます）。投稿済み・失敗は移動できません。
      </p>
    </Card>
  );
}
