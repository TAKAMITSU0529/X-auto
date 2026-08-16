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

/** ジャンル・トレンド分析の結果 (F-11 / TREND RADAR)。全て AI推定 */
export type TrendAnalysisResult = {
  /** 急激に伸びているテーマ */
  risingTopics: string[];
  /** 継続的に伸びるテーマ */
  evergreenTopics: string[];
  /** 競合過多のテーマ */
  saturatedTopics: string[];
  /** 需要があるのに発信者が少ないテーマ */
  opportunityTopics: string[];
  frequentKeywords: string[];
  summary: string;
  /** 投稿ネタ候補。ワンクリックで F-06 の入力になる */
  postIdeas: { title: string; angle: string }[];
};

/** 競合候補の評価 (F-08 / COMPETITOR SCORE)。AI推定 */
export type CompetitorScore = {
  handle: string;
  /** 0〜100。要件定義 §31 の観点 (ジャンル/読者/内容の類似・成長性等) の総合 */
  score: number;
  genre: string;
  reasons: string[];
};

/** ポジショニング分析の結果 (F-12)。全て AI推定 (マーケティング仮説) */
export type PositioningResult = {
  /** マップの2軸 (AIが最適な軸を提案する) */
  axes: {
    x: { label: string; low: string; high: string };
    y: { label: string; low: string; high: string };
  };
  /** 競合の配置 (-1〜1 の座標) */
  placements: { handle: string; x: number; y: number }[];
  /** あなたが取るべき推奨ポジション */
  recommendedPosition: { x: number; y: number; label: string };
  /** ポジショニング候補と採点 (§28: 競合密度/需要/差別化/実績/専門性/マネタイズ/継続性) */
  candidates: { name: string; score: number; reasons: string[] }[];
  /** 空きポジションの仮説 */
  recommendation: string;
  /** プロフィール3案 (§29) */
  profiles: {
    title: string;
    name: string;
    bio: string;
    pinnedPost: string;
    headerCopy: string;
  }[];
};

/**
 * CUSTOMER INSIGHT (F-09)。
 * 「本人が言葉にしていない本音」の仮説化。AIによる心理推定は事実として
 * 扱わず、必ず「マーケティング仮説」と表示すること (§9)。
 */
export type CustomerInsightResult = {
  /** 表面的課題 */
  surfaceProblem: string;
  /** 本当の課題 */
  realProblem: string;
  /** 感情 */
  emotions: string[];
  /** 恐れている未来 */
  fearedFuture: string;
  /** 欲しい未来 */
  desiredFuture: string;
  /** 行動しない理由 */
  whyNotAct: string;
  /** 購入しない理由 */
  whyNotBuy: string;
  /** 信じている常識 */
  believedNorm: string;
  /** 壊すべき常識 */
  normToBreak: string;
};

/** MARKETING PLAYBOOK (F-09)。全て AI推定 (マーケティング仮説) */
export type PlaybookResult = {
  /** 原則別アドバイス (USP/リスクリバーサル/LTV/紹介/オファー等) */
  advices: { area: string; advice: string; action: string }[];
  /** リストマーケティング動線: X → リスト化 → 教育 → 商品 */
  funnel: {
    steps: { label: string; description: string }[];
    note: string;
  };
  /** CUSTOMER JOURNEY: 認知→興味→信頼→比較→相談→購入 の各段階 */
  journey: { stage: string; goal: string; postHint: string }[];
};

/**
 * 競合1件のマネタイズ動線 (F-13)。
 * confirmedFacts は公開情報から確認できた事実 (DATA)、
 * estimated と funnelSteps の basis="estimated" は AI推定。
 * 収益額・成約率など非公開情報は推測しない (§9)。
 */
export type CompetitorFunnel = {
  handle: string;
  /** 収益タイプの分類 (コンテンツ販売/コンサル/スクール/SaaS/コミュニティ等) */
  monetizationType: string;
  /** 公開情報 (bio・URL・投稿) から確認できた事実 */
  confirmedFacts: string[];
  /** AIによる推定 */
  estimated: string[];
  /** FUNNEL MAP: 認知→…→商品 の推定導線 */
  funnelSteps: { label: string; basis: "confirmed" | "estimated" }[];
};

/** 競合マネタイズ動線分析の結果 (F-13) */
export type FunnelAnalysisResult = {
  competitors: CompetitorFunnel[];
  /** 「自分が転用するならこの動線」の提案 (AI推定) */
  adaptation: { steps: string[]; reason: string };
};

/** 投稿前AIチェックの1項目 (F-07 拡張) */
export type PostCheckItem = {
  /** readability / typos / hook / redundancy / targetFit / brandFit / cta / risk */
  key: string;
  label: string;
  ok: boolean;
  comment: string;
};

/**
 * 投稿前AIチェックの結果 (F-07 拡張)。
 * 類似投稿・重複チェックはルールベースで別途行う (lib/generation/precheck.ts)。
 */
export type PostCheckResult = {
  items: PostCheckItem[];
  /** ok = このまま投稿してよい / caution = 注意項目あり */
  verdict: "ok" | "caution";
  summary: string;
  /** 「AIでもっと強くする」を選んだときに使う改善版本文 */
  improvedText: string;
  /** 改善版で何を変えたか */
  improvementNote: string;
};

/**
 * AI CHAT (F-22) の1回の応答。
 * §9 に従い、確認できた事実 (DATA)・AI仮説 (HYPOTHESIS)・
 * 次の行動 (ACTION) を必ず区別して返す。
 */
export type ChatReply = {
  /** 会話としての回答本文 */
  answer: string;
  /** 回答の根拠になった実測データ (DATA) */
  dataPoints: string[];
  /** AIによる仮説・推定 (HYPOTHESIS) */
  hypotheses: string[];
  /** 次にやること (ACTION) */
  nextActions: string[];
};

export type ChatMessage = { role: "user" | "assistant"; text: string };

/** AUTO CONTENT PLAN (F-23) の計画1件 */
export type ContentPlanItem = {
  /** 投稿予定日 (YYYY-MM-DD) */
  date: string;
  /** 推奨時間帯 (例: "19:00") */
  time: string;
  /** どの柱 (F-18) の投稿か */
  pillar: string;
  /** 目的 (Reach/Authority/Trust/Education/Conversion) */
  purpose: string;
  title: string;
  angle: string;
};

export type ContentPlanResult = {
  items: ContentPlanItem[];
  /** 計画の設計意図 */
  note: string;
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
    /** マーケティング戦略設定 (F-09)。あれば「誰に・何を」をぶれさせない */
    strategy?: unknown;
    /** KNOWLEDGE BASE (F-17)。競合投稿より優先する一次情報 */
    knowledge?: { kind: string; title: string; content: string }[];
    /** CUSTOMER JOURNEY のどの段階の人向けか (F-09) */
    journeyStage?: string;
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

  /** ジャンルの高反応投稿群からトレンドを分類する (F-11) */
  analyzeTrends(input: {
    genre: string;
    posts: { text: string; likes: number }[];
  }): Promise<TrendAnalysisResult>;

  /** 競合候補をベンチマーク適性で採点する (F-08 COMPETITOR SCORE) */
  scoreCompetitors(input: {
    genre: string;
    candidates: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<CompetitorScore[]>;

  /** ポジショニング分析とプロフィール生成 (F-12) */
  analyzePositioning(input: {
    genre: string;
    brand?: unknown;
    competitors: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<PositioningResult>;

  /** CUSTOMER INSIGHT の仮説化 (F-09) */
  generateCustomerInsight(input: {
    who: unknown;
    what: unknown;
    why: unknown;
    how: unknown;
  }): Promise<CustomerInsightResult>;

  /** MARKETING PLAYBOOK の生成 (F-09) */
  generatePlaybook(input: {
    strategy: unknown;
    insight?: unknown;
    brand?: unknown;
  }): Promise<PlaybookResult>;

  /** 競合マネタイズ動線分析 (F-13) */
  analyzeFunnels(input: {
    competitors: {
      handle: string;
      name: string;
      bio: string;
      url: string | null;
      ctaPosts: string[];
    }[];
  }): Promise<FunnelAnalysisResult>;

  /** 投稿前AIチェック (F-07 拡張) */
  checkPost(input: {
    text: string;
    brand?: unknown;
    strategy?: unknown;
  }): Promise<PostCheckResult>;

  /** AI CHAT (F-22): 蓄積データを文脈に質問へ答える */
  chat(input: {
    question: string;
    history: ChatMessage[];
    /** DB から組み立てた実測データの要約 (DATA) */
    context: unknown;
  }): Promise<ChatReply>;

  /** AUTO CONTENT PLAN (F-23): 月間投稿計画を設計する */
  generateContentPlan(input: {
    count: number;
    startDate: string;
    endDate: string;
    context: unknown;
  }): Promise<ContentPlanResult>;
}
