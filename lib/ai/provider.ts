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
}
