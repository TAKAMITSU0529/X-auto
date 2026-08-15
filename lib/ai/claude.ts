import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type {
  AiProvider,
  BatchAnalysisResult,
  DraftResult,
  DraftScore,
  PostAnalysisResult,
  StructureBlock,
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

    const prompt = `${sourceSection}${brandSection}
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
}
