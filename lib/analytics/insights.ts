import { prisma } from "@/lib/db";

/**
 * 自己投稿のパフォーマンス分析 (要件定義 F-10 拡張 / F-19 Learning Loop 初版)。
 *
 * INPUT (HOOKタイプ・投稿形式・投稿時間帯) と RESULT (エンゲージメント率) の
 * 関係を集計し、「このアカウントでは何が伸びるのか」を出す。
 *
 * HOOK・形式の分類は書き出しパターンによる**ルールベース**であり、
 * 集計結果は実測値の集計 = DATA として扱える (AI推定ではない)。
 * サンプルが少ないうちは信頼できないため、必ず件数を併記する。
 */

export type HookType =
  | "失敗談型"
  | "常識否定型"
  | "質問型"
  | "数字型"
  | "体験談型"
  | "断言型"
  | "その他";

/** 書き出し (最初の行) から HOOK タイプを機械分類する (F-10 HOOK ANALYSIS) */
export function classifyHook(text: string): HookType {
  const firstLine = (text.split("\n").find((l) => l.trim()) ?? "").trim();

  if (/失敗|やらかし|反省|うまくいかな/.test(firstLine)) return "失敗談型";
  if (/[0-9０-９]+割|9割|実は|誤解|間違い|逆です|勘違い|知らない/.test(firstLine))
    return "常識否定型";
  if (/[?？]$/.test(firstLine)) return "質問型";
  if (/^[0-9０-９]|[0-9０-９]+(年|ヶ月|日|時間|万|円|件|社|%|％|倍)/.test(firstLine))
    return "数字型";
  if (/昨日|先日|先月|今朝|さっき|この前/.test(firstLine)) return "体験談型";
  if (/断言|結論|正直|言い切/.test(firstLine) || firstLine.length <= 15)
    return "断言型";
  return "その他";
}

export type PostFormat = "箇条書き" | "短文" | "中文" | "長文";

/** 投稿形式の機械分類 (F-10 POST FORMAT ANALYSIS) */
export function classifyFormat(text: string): PostFormat {
  if (/\n[・\-①②③✓☑︎]|\n\d+[.．)]/.test(text)) return "箇条書き";
  if (text.length < 140) return "短文";
  if (text.length < 300) return "中文";
  return "長文";
}

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 3時間刻みの時間帯スロット (日本時間) */
export const SLOT_LABELS = [
  "0-3時",
  "3-6時",
  "6-9時",
  "9-12時",
  "12-15時",
  "15-18時",
  "18-21時",
  "21-24時",
];

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

export type BucketStat = {
  label: string;
  count: number;
  avgEngagementRate: number;
};

export type HeatmapCell = {
  day: number;
  slot: number;
  count: number;
  avgEngagementRate: number;
};

export type PerformanceInsights = {
  sampleSize: number;
  byHook: BucketStat[];
  byFormat: BucketStat[];
  byDay: BucketStat[];
  bySlot: BucketStat[];
  heatmap: HeatmapCell[];
  /** サンプル2件以上のバケツから選んだ「伸びる要素」。無ければ null */
  best: {
    hook: string | null;
    format: string | null;
    daySlot: string | null;
  };
  /** ダッシュボードの AI INSIGHT 向けの文章 (実測集計に基づく) */
  insights: string[];
};

/** 集計に必要な最小サンプル数 (これ未満のバケツは best に採用しない) */
const MIN_BUCKET_SAMPLE = 2;

export async function computePerformanceInsights(
  userId: string,
): Promise<PerformanceInsights> {
  const posts = await prisma.ownPost.findMany({
    where: { xAccount: { userId } },
    include: { metrics: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });

  type Sample = {
    hook: HookType;
    format: PostFormat;
    day: number;
    slot: number;
    er: number;
  };

  const samples: Sample[] = [];
  for (const post of posts) {
    const m = post.metrics[0];
    if (!m || m.impressions <= 0) continue;
    const engagements = m.likes + m.reposts + m.quotes + m.replies + m.bookmarks;
    const jst = toJst(post.postedAt);
    samples.push({
      hook: classifyHook(post.text),
      format: classifyFormat(post.text),
      day: jst.getUTCDay(),
      slot: Math.floor(jst.getUTCHours() / 3),
      er: engagements / m.impressions,
    });
  }

  const bucket = (
    keys: string[],
    keyOf: (s: Sample) => string,
  ): BucketStat[] =>
    keys
      .map((label) => {
        const hits = samples.filter((s) => keyOf(s) === label);
        return {
          label,
          count: hits.length,
          avgEngagementRate:
            hits.length > 0
              ? hits.reduce((sum, s) => sum + s.er, 0) / hits.length
              : 0,
        };
      })
      .filter((b) => b.count > 0)
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  const byHook = bucket(
    ["失敗談型", "常識否定型", "質問型", "数字型", "体験談型", "断言型", "その他"],
    (s) => s.hook,
  );
  const byFormat = bucket(["箇条書き", "短文", "中文", "長文"], (s) => s.format);
  const byDay = bucket(
    DAY_LABELS.map((_, i) => String(i)),
    (s) => String(s.day),
  ).map((b) => ({ ...b, label: `${DAY_LABELS[Number(b.label)]}曜` }));
  const bySlot = bucket(
    SLOT_LABELS.map((_, i) => String(i)),
    (s) => String(s.slot),
  ).map((b) => ({ ...b, label: SLOT_LABELS[Number(b.label)] }));

  const heatmap: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let slot = 0; slot < 8; slot++) {
      const hits = samples.filter((s) => s.day === day && s.slot === slot);
      if (hits.length === 0) continue;
      heatmap.push({
        day,
        slot,
        count: hits.length,
        avgEngagementRate:
          hits.reduce((sum, s) => sum + s.er, 0) / hits.length,
      });
    }
  }

  const bestOf = (stats: BucketStat[]): BucketStat | null =>
    stats.find((s) => s.count >= MIN_BUCKET_SAMPLE) ?? null;

  const bestHook = bestOf(byHook);
  const bestFormat = bestOf(byFormat);
  const bestDay = bestOf(byDay);
  const bestSlot = bestOf(bySlot);

  const insights: string[] = [];
  if (bestHook) {
    insights.push(
      `書き出しが「${bestHook.label}」の投稿の平均エンゲージメント率が最も高くなっています（${(bestHook.avgEngagementRate * 100).toFixed(1)}%・${bestHook.count}件）。`,
    );
  }
  if (bestSlot) {
    insights.push(
      `${bestSlot.label}（日本時間）の投稿の成績が現在最も高くなっています（${(bestSlot.avgEngagementRate * 100).toFixed(1)}%・${bestSlot.count}件）。`,
    );
  }
  if (bestFormat) {
    insights.push(
      `投稿形式では「${bestFormat.label}」の平均反応率が高い傾向です（${bestFormat.count}件）。`,
    );
  }
  if (samples.length < 10) {
    insights.push(
      `分析サンプルがまだ ${samples.length} 件のため、傾向は参考程度に見てください。投稿を重ねるほど精度が上がります。`,
    );
  }

  return {
    sampleSize: samples.length,
    byHook,
    byFormat,
    byDay,
    bySlot,
    heatmap,
    best: {
      hook: bestHook?.label ?? null,
      format: bestFormat?.label ?? null,
      daySlot:
        bestDay && bestSlot ? `${bestDay.label} ${bestSlot.label}` : null,
    },
    insights,
  };
}
