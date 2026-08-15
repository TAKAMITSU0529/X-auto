/**
 * LLM プロバイダの抽象化 (要件定義 §5「LLM API 抽象化レイヤー」)。
 *
 * 実装は claude.ts (Anthropic API) と mock.ts の2つ。
 * 呼び出し側はこのインターフェースだけに依存させ、モデルやプロバイダの
 * 変更がアプリ全体に波及しないようにする。
 */

/** 投稿の構成ブロック */
export type StructureBlock = {
  label: string;
  text: string;
};

/**
 * 投稿分析の結果 (F-04 の10項目)。
 * これらは AI による推定を含むため、UI では §9 に従い
 * DATA (事実) と HYPOTHESIS (仮説) を区別して表示すること。
 */
export type PostAnalysisResult = {
  theme: string;
  targetAudience: string;
  insight: {
    dissatisfaction?: string;
    desire?: string;
    anxiety?: string;
    problem?: string;
    ideal?: string;
    assumption?: string;
  };
  structure: StructureBlock[];
  templateType: string;
  hook: string;
  hookReason: string;
  keywords: string[];
  emotions: string[];
  specificity: {
    numbers: string[];
    examples: string[];
    properNouns: string[];
    hasStory: boolean;
  };
  cta: string | null;
  whyItWorks: string;
};

/** 3案生成の結果 (F-06) */
export type DraftResult = {
  approach: "reach" | "authority" | "empathy";
  label: string;
  text: string;
  intent: string;
  expectedReaction: string;
};

/** 複数投稿の一括分析の結果 (F-04 一括 / F-16 WINNING PATTERN) */
export type BatchAnalysisResult = {
  /** 共通して使われている文章構造 */
  commonStructures: string[];
  /** 頻出する書き出しのタイプ */
  commonHooks: string[];
  frequentThemes: string[];
  frequentKeywords: string[];
  emotions: string[];
  ctas: string[];
  avgLength: number;
  formats: string[];
  /** このアカウント/投稿群の勝ちパターン */
  winningPatterns: {
    name: string;
    description: string;
    steps: string[];
    hookHint: string;
  }[];
  summary: string;
};

/** AI予測反応スコア (F-06)。10軸 + 総合点 */
export type DraftScore = {
  total: number;
  axes: {
    hook: number;
    relevance: number;
    specificity: number;
    novelty: number;
    credibility: number;
    emotion: number;
    readability: number;
    shareability: number;
    cta: number;
    brandFit: number;
  };
  comment: string;
};

/** 週次AIレポート (F-20)。summary/highlights は AI推定、stats は実測 */
export type WeeklyReportResult = {
  summary: string;
  highlights: string[];
  /** 来週増やすべきこと */
  increase: string[];
  /** 減らすべきこと */
  decrease: string[];
  /** NEXT BEST ACTION: 次に行う具体的な行動 */
  nextActions: string[];
};

export interface AiProvider {
  /** 投稿を分析する (F-04) */
  analyzePost(input: {
    text: string;
    authorHandle: string;
  }): Promise<PostAnalysisResult>;

  /** 投稿文を3案生成する (F-06) */
  generateDrafts(input: {
    sourceText?: string;
    structure?: StructureBlock[];
    genre: string;
    message: string;
    brand?: {
      basicInfo?: unknown;
      style?: unknown;
      prohibited?: unknown;
    };
  }): Promise<DraftResult[]>;

  /** 複数投稿を一括分析し勝ちパターンを抽出する (F-04 一括 / F-16) */
  analyzeBatch(input: {
    posts: { text: string; outlierScore: number }[];
    accountHandle: string;
  }): Promise<BatchAnalysisResult>;

  /** 生成した3案に AI予測反応スコアを付ける (F-06) */
  scoreDrafts(input: {
    drafts: { label: string; text: string }[];
    genre: string;
    brand?: unknown;
  }): Promise<DraftScore[]>;

  /** 週次レポートと NEXT BEST ACTION を生成する (F-20) */
  generateWeeklyReport(input: {
    stats: unknown;
  }): Promise<WeeklyReportResult>;
}
