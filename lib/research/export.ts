import type { RankedPost } from "@/lib/research/service";

/**
 * リサーチ結果の CSV エクスポート (要件定義 F-02 出力)。
 * Excel での文字化けを防ぐため BOM 付き UTF-8 で出力する。
 */

function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildResearchCsv(args: {
  posts: RankedPost[];
  accountHandle: string;
  baselineRate: number;
}): string {
  const header = [
    "順位",
    "外れ値スコア(通常比)",
    "X AUTO SCORE",
    "エンゲージメント率",
    "インプレッション",
    "いいね",
    "リポスト",
    "引用",
    "返信",
    "ブックマーク",
    "総エンゲージメント",
    "投稿日時",
    "本文",
    "URL",
  ];

  const rows = args.posts.map((post, index) =>
    [
      index + 1,
      post.outlierScore.toFixed(2),
      post.impactScore,
      (post.engagementRate * 100).toFixed(3) + "%",
      post.metrics.impressions,
      post.metrics.likes,
      post.metrics.reposts,
      post.metrics.quotes,
      post.metrics.replies,
      post.metrics.bookmarks,
      post.totalEngagements,
      post.postedAt.toISOString(),
      post.text,
      post.permalink ?? "",
    ]
      .map(csvField)
      .join(","),
  );

  const meta = `# @${args.accountHandle} / 通常エンゲージメント率(中央値): ${(args.baselineRate * 100).toFixed(3)}%`;

  // BOM + メタ行 + ヘッダ + データ
  return "﻿" + [meta, header.map(csvField).join(","), ...rows].join("\r\n");
}
