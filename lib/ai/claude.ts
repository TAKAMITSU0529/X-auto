import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type {
  AiProvider,
  BatchAnalysisResult,
  CompetitorScore,
  CustomerInsightResult,
  FunnelAnalysisResult,
  PlaybookResult,
  PositioningResult,
  DraftResult,
  DraftScore,
  PostAnalysisResult,
  StructureBlock,
  TrendAnalysisResult,
  WeeklyReportResult,
} from "@/lib/ai/provider";

/**
 * Anthropic (Claude) を使った実装。
 *
 * 出力は JSON スキーマに沿わせ、パースできない場合は明示的にエラーにする
 * (推測でフォールバックすると §9 の DATA/HYPOTHESIS の境界が壊れるため)。
 */

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

function createClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AiConfigurationError(
      "ANTHROPIC_API_KEY が設定されていません。AI_MODE=real で動かすには .env に API キーが必要です。",
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

const ANALYSIS_SYSTEM = `あなたはX(旧Twitter)の投稿を分析するマーケティングアナリストです。
与えられた投稿を分析し、指定されたJSON形式のみで回答してください。

重要な制約:
- 事実として観測できること(本文に書かれている数字・表現)と、あなたの推定を混同しないこと
- 健康・政治的信条・人種・宗教・性的指向などのセンシティブ属性は推定しないこと
- 断定を避け、推定は推定として表現すること
- 日本語で回答すること`;

const DRAFT_SYSTEM = `あなたはX(旧Twitter)の投稿を作成する日本語のコピーライターです。
参考投稿が与えられた場合、その【構造・フックの作り方・心理の動かし方・情報の並べ方・CTAの形】だけを転用し、
内容は必ずユーザー本人の情報で書いてください。参考投稿の文面をコピーしてはいけません。

指定されたJSON形式のみで回答してください。日本語で回答すること。`;

function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new Error(
      `AIの応答をJSONとして解釈できませんでした: ${candidate.slice(0, 200)}`,
    );
  }
}

async function complete(
  client: Anthropic,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export class ClaudeAiProvider implements AiProvider {
  async analyzePost(input: {
    text: string;
    authorHandle: string;
  }): Promise<PostAnalysisResult> {
    const client = createClient();

    const prompt = `次のX投稿を分析してください。

投稿者: @${input.authorHandle}
本文:
"""
${input.text}
"""

次のJSON形式で回答してください:
{
  "theme": "何について発信しているか",
  "targetAudience": "誰に刺さる投稿か",
  "insight": {
    "dissatisfaction": "ターゲットの不満",
    "desire": "欲求",
    "anxiety": "不安",
    "problem": "課題",
    "ideal": "理想",
    "assumption": "信じている常識・思い込み"
  },
  "structure": [{"label": "フック", "text": "該当箇所"}],
  "templateType": "型の判定 (リスト型/ストーリー型/逆張り型/権威型/共感型/問題提起型 など)",
  "hook": "冒頭の1〜2文",
  "hookReason": "なぜ読まれるのか",
  "keywords": ["反応を取っているキーワード"],
  "emotions": ["刺激している感情"],
  "specificity": {
    "numbers": ["本文中の数字"],
    "examples": ["実例"],
    "properNouns": ["固有名詞"],
    "hasStory": true
  },
  "cta": "行動誘導があれば記述、無ければ null",
  "whyItWorks": "なぜこの投稿が伸びた可能性が高いのかの説明 (推定であることを前提に)"
}`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 2048);
    return extractJson<PostAnalysisResult>(raw);
  }

  async generateDrafts(input: {
    sourceText?: string;
    structure?: StructureBlock[];
    genre: string;
    message: string;
    brand?: {
      basicInfo?: unknown;
      style?: unknown;
      prohibited?: unknown;
    };
    strategy?: unknown;
    knowledge?: { kind: string; title: string; content: string }[];
    journeyStage?: string;
  }): Promise<DraftResult[]> {
    const client = createClient();

    const sourceSection = input.sourceText
      ? `参考投稿(構造のみ転用する。文面のコピーは禁止):
"""
${input.sourceText}
"""
`
      : "";

    const brandSection = input.brand
      ? `発信者の情報:
${JSON.stringify(input.brand, null, 2)}
`
      : "";

    // マーケティング戦略 (F-09)。「誰に・何を・どんなふうに」をぶれさせない
    const strategySection = input.strategy
      ? `マーケティング戦略設定 (誰に・何を・なぜ自分か・どう伝えるか。この設定からぶれないこと):
${JSON.stringify(input.strategy, null, 2)}
`
      : "";

    // KNOWLEDGE BASE (F-17)。競合投稿より優先する一次情報
    const knowledgeSection =
      input.knowledge && input.knowledge.length > 0
        ? `本人のKNOWLEDGE BASE (最優先の一次情報。参考投稿や一般論より、ここにある本人の経験・考え方・事例を優先して使うこと):
${input.knowledge
  .map((k) => `【${k.kind}】${k.title}\n${k.content}`)
  .join("\n\n")}
`
        : "";

    const journeySection = input.journeyStage
      ? `この投稿のターゲット段階 (CUSTOMER JOURNEY): ${input.journeyStage} — この段階の読者に響く内容・CTAにすること
`
      : "";

    const prompt = `${sourceSection}${brandSection}${strategySection}${knowledgeSection}${journeySection}
ジャンル: ${input.genre}
今回伝えたい内容: ${input.message}

アプローチの異なる3案を作成してください。
A案は反応重視(フックを強く)、B案は信頼・専門性重視(深い知見)、C案は人間性・共感重視(経験・ストーリー)。

次のJSON形式で回答してください:
{
  "drafts": [
    {
      "approach": "reach",
      "label": "A案：反応重視",
      "text": "投稿本文",
      "intent": "この案の狙い",
      "expectedReaction": "想定される反応"
    }
  ]
}`;

    const raw = await complete(client, DRAFT_SYSTEM, prompt, 3072);
    const parsed = extractJson<{ drafts: DraftResult[] }>(raw);

    if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) {
      throw new Error("AIから有効な投稿案が返りませんでした。");
    }

    return parsed.drafts;
  }

  async analyzeBatch(input: {
    posts: { text: string; outlierScore: number }[];
    accountHandle: string;
  }): Promise<BatchAnalysisResult> {
    const client = createClient();

    const postsSection = input.posts
      .map(
        (p, i) =>
          `--- 投稿${i + 1} (外れ値スコア ${p.outlierScore.toFixed(1)}倍) ---\n${p.text}`,
      )
      .join("\n\n");

    const prompt = `@${input.accountHandle} の高反応投稿群を横断分析してください。
外れ値スコアは「そのアカウントの通常エンゲージメント率の何倍か」を示す実測値です。
スコアが高い投稿ほど重視して、このアカウントの勝ちパターンを抽出してください。

${postsSection}

次のJSON形式で回答してください:
{
  "commonStructures": ["共通する文章構造"],
  "commonHooks": ["頻出する書き出しのタイプ"],
  "frequentThemes": ["頻出テーマ"],
  "frequentKeywords": ["頻出キーワード"],
  "emotions": ["刺激している感情"],
  "ctas": ["誘導のパターン"],
  "avgLength": 平均文字数の数値,
  "formats": ["投稿形式 (短文/長文/箇条書き/ストーリー/ノウハウ/問題提起/意見/逆張り/実績/事例)"],
  "winningPatterns": [
    {
      "name": "パターン名 (例: 常識否定 → 実データ → 教訓)",
      "description": "なぜこの型が効くのかの説明",
      "steps": ["ステップ1", "ステップ2"],
      "hookHint": "書き出しの作り方のヒント"
    }
  ],
  "summary": "このアカウントの勝ちパターンの総括 (推定であることを前提に)"
}

winningPatterns は2〜3個。分析は推定であり断定しないこと。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 3072);
    return extractJson<BatchAnalysisResult>(raw);
  }

  async scoreDrafts(input: {
    drafts: { label: string; text: string }[];
    genre: string;
    brand?: unknown;
  }): Promise<DraftScore[]> {
    const client = createClient();

    const draftsSection = input.drafts
      .map((d, i) => `--- 案${i + 1} (${d.label}) ---\n${d.text}`)
      .join("\n\n");

    const prompt = `次のX投稿案を評価してください。ジャンル: ${input.genre}
${input.brand ? `発信者情報: ${JSON.stringify(input.brand)}` : ""}

${draftsSection}

各案について10軸 (各0〜10点) で採点し、総合点 (0〜100) を付けてください。
これは保証ではなくAIによる予測であることを前提に、辛口で採点してください。

次のJSON形式で回答してください:
{
  "scores": [
    {
      "total": 85,
      "axes": {
        "hook": 8, "relevance": 8, "specificity": 7, "novelty": 6,
        "credibility": 7, "emotion": 7, "readability": 8,
        "shareability": 6, "cta": 5, "brandFit": 8
      },
      "comment": "改善ポイントの一言"
    }
  ]
}

scores の順序は案の順序と一致させること。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 2048);
    const parsed = extractJson<{ scores: DraftScore[] }>(raw);

    if (!Array.isArray(parsed.scores) || parsed.scores.length !== input.drafts.length) {
      throw new Error("AIから有効なスコアが返りませんでした。");
    }
    return parsed.scores;
  }

  async generateWeeklyReport(input: {
    stats: unknown;
  }): Promise<WeeklyReportResult> {
    const client = createClient();

    const prompt = `X運用の週次レポートを作成してください。
以下は実測データの集計です (事実):

${JSON.stringify(input.stats, null, 2)}

このデータに基づき、AI GROWTH COACH として週次レポートを書いてください。
「分析だけで終わらず、次に何をするか」を必ず具体的に提示すること (NEXT BEST ACTION)。

次のJSON形式で回答してください:
{
  "summary": "今週の総括 (2〜3文)",
  "highlights": ["今週のハイライト"],
  "increase": ["来週増やすべきこと"],
  "decrease": ["減らすべきこと"],
  "nextActions": ["明日〇〇を投稿してください、のような具体的な次の行動 (2〜4個)"]
}`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 2048);
    return extractJson<WeeklyReportResult>(raw);
  }

  async analyzeTrends(input: {
    genre: string;
    posts: { text: string; likes: number }[];
  }): Promise<TrendAnalysisResult> {
    const client = createClient();

    const postsSection = input.posts
      .slice(0, 50)
      .map((p, i) => `--- 投稿${i + 1} (いいね ${p.likes}) ---\n${p.text.slice(0, 300)}`)
      .join("\n\n");

    const prompt = `ジャンル「${input.genre}」の直近の高反応投稿群からトレンドを分析してください。

${postsSection}

TREND RADAR として4分類し、投稿ネタ候補も提案してください。
次のJSON形式で回答してください:
{
  "risingTopics": ["急激に伸びているテーマ"],
  "evergreenTopics": ["継続的に伸びるテーマ"],
  "saturatedTopics": ["競合過多のテーマ"],
  "opportunityTopics": ["需要があるのに発信者が少ないテーマ"],
  "frequentKeywords": ["頻出キーワード"],
  "summary": "このジャンルの傾向の総括 (推定であることを前提に)",
  "postIdeas": [{ "title": "ネタのタイトル", "angle": "切り口の説明" }]
}

postIdeas は3〜5個。分析は推定であり断定しないこと。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 3072);
    return extractJson<TrendAnalysisResult>(raw);
  }

  async scoreCompetitors(input: {
    genre: string;
    candidates: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<CompetitorScore[]> {
    const client = createClient();

    const list = input.candidates
      .map(
        (c) =>
          `@${c.handle} / ${c.name} / フォロワー${c.followers}\nbio: ${c.bio}`,
      )
      .join("\n\n");

    const prompt = `ジャンル「${input.genre}」のベンチマーク候補として、以下のXアカウントを評価してください。
評価観点: ジャンル類似性・想定読者の類似性・発信内容のモデリング価値・成長性・マネタイズ動線の参考価値。
公開プロフィールのみから判断し、センシティブ属性は推定しないこと。

${list}

次のJSON形式で回答してください:
{
  "scores": [
    {
      "handle": "ハンドル名 (@なし)",
      "score": 85,
      "genre": "このアカウントの発信ジャンル",
      "reasons": ["採点理由 (1〜3個)"]
    }
  ]
}

scores は候補全員分、score は 0〜100。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 3072);
    const parsed = extractJson<{ scores: CompetitorScore[] }>(raw);
    if (!Array.isArray(parsed.scores)) {
      throw new Error("AIから有効な競合スコアが返りませんでした。");
    }
    return parsed.scores;
  }

  async analyzePositioning(input: {
    genre: string;
    brand?: unknown;
    competitors: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<PositioningResult> {
    const client = createClient();

    const list = input.competitors
      .map((c) => `@${c.handle} / ${c.name} / フォロワー${c.followers}\nbio: ${c.bio}`)
      .join("\n\n");

    const prompt = `ジャンル「${input.genre}」の市場ポジショニングを分析してください。
${input.brand ? `発信者本人の情報 (この人の強み・実績に合う立ち位置を選ぶこと):\n${JSON.stringify(input.brand)}\n` : ""}
競合アカウント (公開プロフィール):
${list}

1. 市場を分ける最適な2軸を提案し、各競合を -1〜1 の座標に配置する
2. 空いていて本人に合うポジションを推奨する
3. ポジショニング候補を3つ採点する (観点: 競合密度・市場需要・差別化・本人実績・本人専門性・マネタイズ可能性・継続発信可能性)
4. 推奨ポジションに基づくプロフィールを3案生成する

次のJSON形式で回答してください:
{
  "axes": {
    "x": { "label": "軸名", "low": "左端の意味", "high": "右端の意味" },
    "y": { "label": "軸名", "low": "下端の意味", "high": "上端の意味" }
  },
  "placements": [{ "handle": "ハンドル名", "x": 0.5, "y": -0.3 }],
  "recommendedPosition": { "x": 0.7, "y": 0.8, "label": "推奨ポジションの短い名前" },
  "candidates": [{ "name": "候補名", "score": 88, "reasons": ["採点理由"] }],
  "recommendation": "空きポジションの仮説 (推定であることを前提に)",
  "profiles": [
    {
      "title": "A案：◯◯型",
      "name": "名前欄 (肩書き付き)",
      "bio": "プロフィール文 (160字以内)",
      "pinnedPost": "固定ポスト案",
      "headerCopy": "ヘッダーに入れる訴求コピー"
    }
  ]
}

profiles は3案。収益額など非公開情報は推測しないこと。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 4096);
    return extractJson<PositioningResult>(raw);
  }

  async generateCustomerInsight(input: {
    who: unknown;
    what: unknown;
    why: unknown;
    how: unknown;
  }): Promise<CustomerInsightResult> {
    const client = createClient();

    const prompt = `以下はある発信者のマーケティング設定 (WHO/WHAT/WHY/HOW) です。
このターゲットの CUSTOMER INSIGHT を仮説化してください。
表面的なターゲット像ではなく「本人が言葉にしていない本音」まで踏み込むこと。
ただしこれはマーケティング仮説であり、事実の断定ではないことを前提に書くこと。

WHO (誰に): ${JSON.stringify(input.who)}
WHAT (何を): ${JSON.stringify(input.what)}
WHY (なぜ自分か): ${JSON.stringify(input.why)}
HOW (どう伝えるか): ${JSON.stringify(input.how)}

次のJSON形式で回答してください:
{
  "surfaceProblem": "表面的課題 (本人が自覚して口にしている課題)",
  "realProblem": "本当の課題 (その裏にある構造的な課題)",
  "emotions": ["いま抱えている感情 (2〜4個)"],
  "fearedFuture": "恐れている未来",
  "desiredFuture": "欲しい未来",
  "whyNotAct": "行動しない理由",
  "whyNotBuy": "購入しない理由",
  "believedNorm": "信じている常識",
  "normToBreak": "壊すべき常識"
}

健康・政治・宗教などのセンシティブ属性は推定しないこと。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 2048);
    return extractJson<CustomerInsightResult>(raw);
  }

  async generatePlaybook(input: {
    strategy: unknown;
    insight?: unknown;
    brand?: unknown;
  }): Promise<PlaybookResult> {
    const client = createClient();

    const prompt = `以下の発信者のために MARKETING PLAYBOOK を作成してください。
ダイレクトレスポンス／顧客中心マーケティングの普遍的な原則
(ターゲット市場の絞り込み・USP・顧客価値・卓越の戦略・リスクリバーサル・
LTV/継続/クロスセル・紹介/JV・見込み客育成・オファー/CTA・テストと改善・既存資産活用)
を、この発信者のX運用に合わせた具体的なアドバイスに落とし込むこと。
書籍等の本文を転載せず、考え方だけを独自の言葉で適用すること。

マーケティング設定: ${JSON.stringify(input.strategy)}
${input.insight ? `CUSTOMER INSIGHT (仮説): ${JSON.stringify(input.insight)}` : ""}
${input.brand ? `発信者情報: ${JSON.stringify(input.brand)}` : ""}

次のJSON形式で回答してください:
{
  "advices": [
    { "area": "原則名 (例: USP)", "advice": "この発信者に合わせた助言", "action": "今週できる具体的な行動" }
  ],
  "funnel": {
    "steps": [{ "label": "X投稿", "description": "この段階でやること" }],
    "note": "この動線設計の意図"
  },
  "journey": [
    { "stage": "認知", "goal": "この段階のゴール", "postHint": "この段階向けの投稿の作り方" }
  ]
}

advices は4〜6個。funnel.steps は X → リスト化 → 教育 → 商品 の流れで4〜6段。
journey は 認知→興味→信頼→比較→相談→購入 の6段階すべて。
全てマーケティング仮説であり、成果の保証をしないこと。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 4096);
    return extractJson<PlaybookResult>(raw);
  }

  async analyzeFunnels(input: {
    competitors: {
      handle: string;
      name: string;
      bio: string;
      url: string | null;
      ctaPosts: string[];
    }[];
  }): Promise<FunnelAnalysisResult> {
    const client = createClient();

    const list = input.competitors
      .map(
        (c) =>
          `@${c.handle} / ${c.name}
bio: ${c.bio}
プロフィールURL: ${c.url ?? "なし"}
誘導を含む投稿の例:
${c.ctaPosts.length > 0 ? c.ctaPosts.map((p) => `- ${p.slice(0, 200)}`).join("\n") : "- (DB内に該当なし)"}`,
      )
      .join("\n\n---\n\n");

    const prompt = `以下の競合アカウントの公開情報から、それぞれのマネタイズ動線を分析してください。

重要な制約:
- 「確認済み」(confirmedFacts / basis:"confirmed") には、与えられた bio・URL・投稿から実際に確認できることだけを入れること
- それ以外の推測は必ず「推定」(estimated / basis:"estimated") に分類すること
- 収益額・成約率・顧客数などの非公開情報は推測しないこと

${list}

次のJSON形式で回答してください:
{
  "competitors": [
    {
      "handle": "ハンドル名 (@なし)",
      "monetizationType": "収益タイプ (コンテンツ販売/コンサル・スクール/店舗集客/SaaS/講座/セミナー/コミュニティ/広告・アフィリエイト/採用 など)",
      "confirmedFacts": ["公開情報から確認できた事実"],
      "estimated": ["AIによる推定"],
      "funnelSteps": [{ "label": "X投稿 (認知)", "basis": "confirmed" }]
    }
  ],
  "adaptation": {
    "steps": ["自分が転用する場合の動線ステップ"],
    "reason": "なぜこの動線が転用に適するか"
  }
}

funnelSteps は 認知→プロフィール→リスト化→教育→商品 のような4〜6段の導線。
competitors は全員分。`;

    const raw = await complete(client, ANALYSIS_SYSTEM, prompt, 4096);
    return extractJson<FunnelAnalysisResult>(raw);
  }
}
