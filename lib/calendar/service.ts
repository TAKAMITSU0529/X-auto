import { ScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * コンテンツカレンダー (要件定義 F-07【A】)。
 *
 * - 月・週表示。予約 (scheduled) はドラッグ&ドロップで日付を変更できる
 * - おすすめ時間帯サジェストは F-10 の自己実績 (DATA) を根拠にする
 * - CONTENT PILLARS (F-18) の不足テーマをカレンダーからネタ提案に反映する
 *
 * 表示・日付の区切りはすべて日本時間 (JST) に統一する
 * (自己分析 F-10 の時間帯分析と揃え、深夜の予約が別日にずれて見えないように)。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC Date → JST の年月日等を読むための Date (getUTC* で読むこと) */
export function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** JST の日付キー (YYYY-MM-DD) */
export function jstDateKey(date: Date): string {
  const jst = toJst(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** JST の時刻ラベル (HH:mm) */
export function jstTimeLabel(date: Date): string {
  const jst = toJst(date);
  return `${String(jst.getUTCHours()).padStart(2, "0")}:${String(
    jst.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export type CalendarEntry = {
  scheduledPostId: string;
  dateKey: string;
  timeLabel: string;
  text: string;
  status: ScheduleStatus;
  handle: string;
  /** D&D で移動できるか (未来の scheduled のみ) */
  movable: boolean;
};

/** 指定期間 (UTC instant) の予約投稿・投稿済みをカレンダー項目として返す */
export async function getCalendarEntries(args: {
  userId: string;
  /** 期間の開始 (含む) */
  from: Date;
  /** 期間の終了 (含まない) */
  to: Date;
}): Promise<CalendarEntry[]> {
  const posts = await prisma.scheduledPost.findMany({
    where: {
      generatedPost: { userId: args.userId },
      scheduledAt: { gte: args.from, lt: args.to },
    },
    include: { xAccount: { select: { handle: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return posts.map((post) => ({
    scheduledPostId: post.id,
    dateKey: jstDateKey(post.scheduledAt),
    timeLabel: jstTimeLabel(post.scheduledAt),
    text: post.text,
    status: post.status,
    handle: post.xAccount.handle,
    movable:
      post.status === ScheduleStatus.scheduled &&
      post.scheduledAt.getTime() > Date.now(),
  }));
}

/**
 * 予約の日付だけを変更する (時刻は維持)。カレンダーの D&D から呼ばれる。
 * targetDateKey は JST の YYYY-MM-DD。
 */
export async function reschedulePostDate(args: {
  userId: string;
  scheduledPostId: string;
  targetDateKey: string;
}): Promise<void> {
  const match = args.targetDateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("移動先の日付が不正です。");
  }

  const scheduled = await prisma.scheduledPost.findFirst({
    where: {
      id: args.scheduledPostId,
      generatedPost: { userId: args.userId },
      status: ScheduleStatus.scheduled,
    },
  });
  if (!scheduled) {
    throw new Error("移動できる予約が見つかりません（予約中のみ移動できます）。");
  }

  // JST の時刻を維持したまま日付を差し替える
  const jst = toJst(scheduled.scheduledAt);
  const newJstMs = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    jst.getUTCHours(),
    jst.getUTCMinutes(),
    jst.getUTCSeconds(),
  );
  const newScheduledAt = new Date(newJstMs - JST_OFFSET_MS);

  if (newScheduledAt.getTime() < Date.now() - 60 * 1000) {
    throw new Error("過去の日時には移動できません。");
  }

  await prisma.scheduledPost.update({
    where: { id: scheduled.id },
    data: { scheduledAt: newScheduledAt },
  });
}

export type CalendarWeek = {
  /** 週の各日 (YYYY-MM-DD, 日曜はじまり) */
  dateKeys: string[];
};

/** 月グリッド (日曜はじまり) を JST 基準で組み立てる */
export function buildMonthGrid(year: number, month: number): CalendarWeek[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(firstDay.getTime());
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: CalendarWeek[] = [];
  const cursor = new Date(start.getTime());

  for (let w = 0; w < 6; w++) {
    const dateKeys: string[] = [];
    for (let d = 0; d < 7; d++) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getUTCDate()).padStart(2, "0");
      dateKeys.push(`${y}-${m}-${dd}`);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push({ dateKeys });
    // 翌月に入り切った週まで来たら終了
    if (
      cursor.getUTCMonth() + 1 !== month &&
      cursor.getUTCFullYear() * 100 + cursor.getUTCMonth() + 1 >
        year * 100 + month
    ) {
      break;
    }
  }

  return weeks;
}

/** JST の「今日」の日付キー */
export function todayKeyJst(now = new Date()): string {
  return jstDateKey(now);
}

/** 日付キー範囲 (JST) を UTC instant の [from, to) に変換する */
export function jstRangeToUtc(
  firstDateKey: string,
  lastDateKey: string,
): { from: Date; to: Date } {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return {
    from: new Date(parse(firstDateKey) - JST_OFFSET_MS),
    to: new Date(parse(lastDateKey) + 24 * 60 * 60 * 1000 - JST_OFFSET_MS),
  };
}
