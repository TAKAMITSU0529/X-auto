/**
 * 外れ値投稿の検出 (要件定義 F-14)。
 *
 * 「いいねが多いから強い」ではなく、**そのアカウントの普段の成績と比べて
 * 異常に伸びた投稿** を見つけるための計算。モデリング候補の質がこれで決まる。
 *
 *   Outlier Score = その投稿のエンゲージメント率 ÷ アカウントの通常エンゲージメント率
 *
 * ベースラインには平均ではなく **中央値** を使う。平均だと外れ値自身が
 * ベースラインを押し上げてしまい、本来検出したい投稿のスコアが下がるため。
 */

export type EngagementInput = {
  impressions: number;
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  bookmarks: number;
};

/** エンゲージメント率の算出根拠。UI で「何を分母にしたか」を示すために使う。 */
export type EngagementBasis = "impressions" | "followers" | "none";

export type EngagementRate = {
  rate: number;
  basis: EngagementBasis;
  totalEngagements: number;
};

export function totalEngagements(m: EngagementInput): number {
  return m.likes + m.reposts + m.quotes + m.replies + m.bookmarks;
}

/**
 * エンゲージメント率を求める。
 *
 * インプレッションが取得できない投稿があるため、その場合はフォロワー数を
 * 代替の分母として使い、basis で区別できるようにしている
 * (要件定義 §9: 事実と推定・前提を曖昧にしない)。
 */
export function engagementRate(
  metrics: EngagementInput,
  followers?: number,
): EngagementRate {
  const total = totalEngagements(metrics);

  if (metrics.impressions > 0) {
    return {
      rate: total / metrics.impressions,
      basis: "impressions",
      totalEngagements: total,
    };
  }

  if (followers && followers > 0) {
    return { rate: total / followers, basis: "followers", totalEngagements: total };
  }

  return { rate: 0, basis: "none", totalEngagements: total };
}

/** 中央値 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export type BaselineResult = {
  /** 通常時のエンゲージメント率 (中央値) */
  baselineRate: number;
  /** ベースライン算出に使った投稿数 */
  sampleSize: number;
  /** 算出根拠が信頼できるか (サンプルが少なすぎないか) */
  reliable: boolean;
};

/** ベースラインの算出に必要な最小サンプル数 */
export const MIN_BASELINE_SAMPLE = 10;

/**
 * アカウントの通常エンゲージメント率を求める。
 * リポストは本人の文章ではないため除外する。
 */
export function calculateBaseline(
  posts: { metrics: EngagementInput; isRepost?: boolean }[],
  followers?: number,
): BaselineResult {
  const rates = posts
    .filter((p) => !p.isRepost)
    .map((p) => engagementRate(p.metrics, followers))
    .filter((r) => r.basis !== "none")
    .map((r) => r.rate);

  return {
    baselineRate: median(rates),
    sampleSize: rates.length,
    reliable: rates.length >= MIN_BASELINE_SAMPLE,
  };
}

export type OutlierResult = {
  /** 通常比の倍率。1.0 = 平常運転、5.0 = 通常の5倍 */
  score: number;
  rate: number;
  basis: EngagementBasis;
  totalEngagements: number;
};

/** 1件の投稿について Outlier Score を求める */
export function calculateOutlierScore(
  metrics: EngagementInput,
  baseline: BaselineResult,
  followers?: number,
): OutlierResult {
  const er = engagementRate(metrics, followers);

  const score =
    baseline.baselineRate > 0 ? er.rate / baseline.baselineRate : 0;

  return {
    score,
    rate: er.rate,
    basis: er.basis,
    totalEngagements: er.totalEngagements,
  };
}

/** Outlier Score の段階分け。UI のバッジ表示に使う。 */
export type OutlierTier = "extreme" | "strong" | "above" | "normal" | "below";

export function outlierTier(score: number): OutlierTier {
  if (score >= 5) return "extreme";
  if (score >= 3) return "strong";
  if (score >= 1.5) return "above";
  if (score >= 0.7) return "normal";
  return "below";
}

export const OUTLIER_TIER_LABEL: Record<OutlierTier, string> = {
  extreme: "特大の外れ値",
  strong: "強い外れ値",
  above: "平均以上",
  normal: "平常運転",
  below: "平均以下",
};
