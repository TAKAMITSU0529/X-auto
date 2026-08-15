/**
 * 生成文と元投稿の類似度チェック (要件定義 F-05 / §12 コピー防止)。
 *
 * 「構造の転用」は許容するが「文面のコピー」は防ぐ、が目的。
 * 完全な剽窃検出器ではなく、明らかに文面をなぞっている生成文に
 * 警告を出すためのヒューリスティクスとして使う。
 *
 * 指標は2つを組み合わせる:
 *  1. 文字 3-gram の Jaccard 係数 — 全体としての言い回しの重なり
 *  2. 最長共通部分文字列の比率 — 長いフレーズの丸写し検出
 */

/** 比較前の正規化: 空白・改行・URL・記号のゆらぎを除去する */
function normalize(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "") // URL は比較対象にしない
    .replace(/[\s　]+/g, "") // 空白・全角スペース・改行
    .replace(/[「」『』【】()（）.,、。!！?？:：;；・…‥\-ー~〜]/g, "")
    .toLowerCase();
}

function charNgrams(text: string, n: number): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= text.length - n; i++) {
    grams.add(text.slice(i, i + n));
  }
  return grams;
}

/** 文字 3-gram の Jaccard 係数 (0〜1) */
export function ngramJaccard(a: string, b: string, n = 3): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na.length < n || nb.length < n) return na === nb && na.length > 0 ? 1 : 0;

  const gramsA = charNgrams(na, n);
  const gramsB = charNgrams(nb, n);

  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection++;
  }
  const union = gramsA.size + gramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** 最長共通部分文字列の長さ (動的計画法) */
function longestCommonSubstring(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  let best = 0;

  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = prev[j - 1] + 1;
        if (current[j] > best) best = current[j];
      }
    }
    prev = current;
  }
  return best;
}

/** 最長共通フレーズが短い方のテキストに占める比率 (0〜1) */
export function lcsRatio(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  const shorter = Math.min(na.length, nb.length);
  if (shorter === 0) return 0;
  return longestCommonSubstring(na, nb) / shorter;
}

export type SimilarityLevel = "ok" | "caution" | "warning";

export type SimilarityResult = {
  /** 総合スコア (0〜1)。大きいほど元投稿に近い */
  score: number;
  jaccard: number;
  lcs: number;
  level: SimilarityLevel;
  message: string | null;
};

/** 警告のしきい値。運用しながら調整する前提の初期値 */
export const SIMILARITY_WARNING_THRESHOLD = 0.45;
export const SIMILARITY_CAUTION_THRESHOLD = 0.3;

/**
 * 生成文と元投稿の類似度を判定する。
 * UI は warning の場合に赤い警告を表示し、投稿前に書き直しを促す
 * (受け入れ基準7「元投稿と酷似した生成文には警告が表示される」)。
 */
export function checkSimilarity(
  generated: string,
  source: string,
): SimilarityResult {
  const jaccard = ngramJaccard(generated, source);
  const lcs = lcsRatio(generated, source);

  // 長いフレーズの丸写しは Jaccard より重大なので重み付けを高くする
  const score = Math.max(jaccard, lcs * 0.9);

  let level: SimilarityLevel = "ok";
  let message: string | null = null;

  if (score >= SIMILARITY_WARNING_THRESHOLD) {
    level = "warning";
    message =
      "元投稿と文面が酷似しています。このまま投稿するとコピーと見なされるリスクがあります。内容を自分の言葉・経験に置き換えて再生成してください。";
  } else if (score >= SIMILARITY_CAUTION_THRESHOLD) {
    level = "caution";
    message =
      "元投稿と言い回しの重なりがやや多めです。投稿前に自分の表現に書き換えることを推奨します。";
  }

  return {
    score: Math.round(score * 1000) / 1000,
    jaccard: Math.round(jaccard * 1000) / 1000,
    lcs: Math.round(lcs * 1000) / 1000,
    level,
    message,
  };
}
