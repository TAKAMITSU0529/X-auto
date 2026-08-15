import {
  totalEngagements,
  type EngagementInput,
  type OutlierResult,
} from "@/lib/metrics/outlier";

/**
 * X AUTO IMPACT SCORE (要件定義 F-15)。
 *
 * 投稿を横断比較するための独自スコア (0〜100)。単純合算ではなく、
 * アカウント規模・通常成績で補正した複数コンポーネントの加重和。
 *
 * コンポーネント:
 *  - outlier   (40%): 通常比でどれだけ伸びたか (Account Baseline 補正)
 *  - volume    (20%): エンゲージメントの絶対量 (対数スケール)
 *  - er        (15%): エンゲージメント率
 *  - depth     (15%): 反応の質 (ブックマーク・返信・引用は「いいね」より深い)
 *  - recency   (10%): 投稿の新しさ (直近の勝ちパターンほど再現価値が高い)
 *
 * これは実測値から機械的に算出する合成指標であり、AI推定ではない (§9 DATA)。
 * ただし重み付けは運用しながら調整する前提の初期値。
 */

export type ImpactBreakdown = {
  outlier: number;
  volume: number;
  er: number;
  depth: number;
  recency: number;
};

export type ImpactResult = {
  /** 0〜100 の整数 */
  score: number;
  breakdown: ImpactBreakdown;
};

const WEIGHTS: ImpactBreakdown = {
  outlier: 40,
  volume: 20,
  er: 15,
  depth: 15,
  recency: 10,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function calculateImpactScore(args: {
  metrics: EngagementInput;
  outlier: OutlierResult;
  postedAt: Date;
  now?: Date;
}): ImpactResult {
  const { metrics, outlier } = args;
  const now = args.now ?? new Date();

  // 通常比5倍で満点 (Outlier Score は青天井なので飽和させる)
  const outlierComponent = clamp01(outlier.score / 5);

  // 総エンゲージメント 10,000 で満点の対数スケール
  const engagements = totalEngagements(metrics);
  const volumeComponent = clamp01(Math.log10(engagements + 1) / 4);

  // ER 5% で満点
  const erComponent = clamp01(outlier.rate / 0.05);

  // 反応の質: ブックマーク・返信・引用の比重が高いほど深く刺さっている
  const depthComponent =
    engagements > 0
      ? clamp01(
          (metrics.bookmarks * 2 + metrics.replies * 1.5 + metrics.quotes * 1.5) /
            engagements,
        )
      : 0;

  // 90日かけて 1 → 0 へ線形減衰
  const ageDays = (now.getTime() - args.postedAt.getTime()) / (24 * 60 * 60 * 1000);
  const recencyComponent = clamp01(1 - ageDays / 90);

  const breakdown: ImpactBreakdown = {
    outlier: Math.round(outlierComponent * WEIGHTS.outlier),
    volume: Math.round(volumeComponent * WEIGHTS.volume),
    er: Math.round(erComponent * WEIGHTS.er),
    depth: Math.round(depthComponent * WEIGHTS.depth),
    recency: Math.round(recencyComponent * WEIGHTS.recency),
  };

  const score = Math.min(
    100,
    breakdown.outlier +
      breakdown.volume +
      breakdown.er +
      breakdown.depth +
      breakdown.recency,
  );

  return { score, breakdown };
}
