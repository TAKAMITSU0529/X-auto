/**
 * 外部APIの推定単価。
 *
 * 要件定義 §7.1 の目安単価を定数化したもの。X API は従量課金であり
 * 料金は変更されうるため、**Developer Console の料金を正とし** ここは
 * あくまで社内の見積り・上限制御用の推定値として扱う。
 */

export type XCostKey =
  | "user.lookup"
  | "user.search"
  | "posts.read"
  | "posts.ownRead"
  | "posts.search"
  | "posts.create"
  | "posts.createWithUrl";

/** X API: 1単位(=1件)あたりの推定コスト (USD) */
export const X_UNIT_COST_USD: Record<XCostKey, number> = {
  // ユーザー情報の取得・検索
  "user.lookup": 0.005,
  "user.search": 0.005,
  // 他人の投稿の読み取り
  "posts.read": 0.005,
  // 自分の投稿の読み取り (Owned Reads は安い)
  "posts.ownRead": 0.001,
  // 検索エンドポイント経由の読み取り
  "posts.search": 0.005,
  // 投稿の作成
  "posts.create": 0.012,
  // URL 付き投稿は割高
  "posts.createWithUrl": 0.2,
};

export type AiCostKey =
  | "ai.analyzePost"
  | "ai.generateDrafts"
  | "ai.analyzeBatch"
  | "ai.scoreDrafts"
  | "ai.analyzeTrends"
  | "ai.scoreCompetitors"
  | "ai.summarize";

/**
 * AI API: 1回の呼び出しあたりの推定コスト (USD)。
 * 実測トークン量が判明するまでの暫定値 (要件定義 §13 残課題2)。
 */
export const AI_UNIT_COST_USD: Record<AiCostKey, number> = {
  "ai.analyzePost": 0.01,
  "ai.generateDrafts": 0.03,
  "ai.analyzeBatch": 0.05,
  "ai.scoreDrafts": 0.02,
  "ai.analyzeTrends": 0.04,
  "ai.scoreCompetitors": 0.03,
  "ai.summarize": 0.02,
};

export function estimateXCost(key: XCostKey, units: number): number {
  return round6((X_UNIT_COST_USD[key] ?? 0) * units);
}

export function estimateAiCost(key: AiCostKey, units: number): number {
  return round6((AI_UNIT_COST_USD[key] ?? 0) * units);
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
