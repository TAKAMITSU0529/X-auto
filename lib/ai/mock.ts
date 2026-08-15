import type {
  AiProvider,
  BatchAnalysisResult,
  DraftResult,
  DraftScore,
  PostAnalysisResult,
  StructureBlock,
  WeeklyReportResult,
} from "@/lib/ai/provider";

/**
 * AI プロバイダのモック実装。
 * Anthropic API キーが無い状態でも画面と処理フローを検証できるようにする。
 * 入力テキストから機械的に組み立てるだけで、実際の推論は行わない。
 */
export class MockAiProvider implements AiProvider {
  async analyzePost(input: {
    text: string;
    authorHandle: string;
  }): Promise<PostAnalysisResult> {
    const lines = input.text.split("\n").filter((l) => l.trim().length > 0);
    const hook = lines[0] ?? input.text.slice(0, 40);
    const numbers = Array.from(input.text.matchAll(/\d+[%割万円年件倍]?/g)).map(
      (m) => m[0],
    );

    const structure: StructureBlock[] = lines.slice(0, 4).map((line, i) => ({
      label: ["フック", "本文展開", "具体例", "締め・CTA"][i] ?? "本文",
      text: line,
    }));

    return {
      theme: "（モック）AI活用・業務改善",
      targetAudience: "（モック）中小企業の経営者・意思決定者",
      insight: {
        dissatisfaction: "ツールを入れたのに現場が変わらない",
        desire: "少ない人数で成果を出したい",
        anxiety: "投資が無駄になるのが怖い",
        problem: "何から手をつければいいかわからない",
        ideal: "自社に合った形で定着している状態",
        assumption: "AI導入は大企業のものだと思っている",
      },
      structure,
      templateType: "問題提起型",
      hook,
      hookReason:
        "（モック）冒頭で読み手の常識を否定し、続きを読む理由を作っている",
      keywords: numbers.length > 0 ? numbers.slice(0, 5) : ["AI", "業務改善"],
      emotions: ["共感", "発見", "危機感"],
      specificity: {
        numbers: numbers.slice(0, 5),
        examples: [],
        properNouns: [],
        hasStory: input.text.includes("失敗") || input.text.includes("経験"),
      },
      cta: input.text.includes("プロフィール") ? "プロフィールへの誘導" : null,
      whyItWorks:
        "（モック）具体的な数字と実体験が含まれており、読み手が自分事として受け取りやすい構成になっている",
    };
  }

  async generateDrafts(input: {
    genre: string;
    message: string;
  }): Promise<DraftResult[]> {
    const base = input.message.trim() || "伝えたい内容";

    return [
      {
        approach: "reach",
        label: "A案：反応重視",
        text: `9割の人が誤解しています。\n\n${base}\n\n${input.genre}に関わる人は覚えておいて損はないはず。`,
        intent: "強いフックで新規リーチを狙う",
        expectedReaction: "（モック）保存・引用が伸びやすい",
      },
      {
        approach: "authority",
        label: "B案：信頼・専門性重視",
        text: `${input.genre}の現場で繰り返し見てきたことを書きます。\n\n${base}\n\n判断材料になれば。`,
        intent: "知見の深さで信頼を積む",
        expectedReaction: "（モック）プロフィールクリックにつながりやすい",
      },
      {
        approach: "empathy",
        label: "C案：人間性・共感重視",
        text: `正直、最初は失敗しました。\n\n${base}\n\n同じところでつまずいている人、いませんか。`,
        intent: "経験の共有で共感を得る",
        expectedReaction: "（モック）リプライが付きやすい",
      },
    ];
  }

  async analyzeBatch(input: {
    posts: { text: string; outlierScore: number }[];
    accountHandle: string;
  }): Promise<BatchAnalysisResult> {
    const avgLength = Math.round(
      input.posts.reduce((sum, p) => sum + p.text.length, 0) /
        Math.max(1, input.posts.length),
    );

    return {
      commonStructures: [
        "問題提起 → 常識否定 → 具体例 → 結論",
        "実体験 → 気づき → 再現可能な方法",
      ],
      commonHooks: ["数字型", "断言型", "失敗談型"],
      frequentThemes: ["AI導入の定着", "業務の削減", "小さく始める"],
      frequentKeywords: ["AI", "1部署", "定着", "実例", "月20時間"],
      emotions: ["共感", "発見", "危機感"],
      ctas: ["プロフィール誘導", "リプライ促し"],
      avgLength,
      formats: ["問題提起", "ノウハウ", "実績"],
      winningPatterns: [
        {
          name: "常識否定 → 実データ → 教訓",
          description:
            "（モック）冒頭で読者の思い込みを否定し、具体的な数字で裏付けてから、持ち帰れる教訓で締める型。外れ値上位に最も多い。",
          steps: ["常識否定のフック", "具体的な数字・実例", "再現可能な教訓", "軽いCTA"],
          hookHint: "「9割の人が〜」「これ、逆です」など断言・逆張りで始める",
        },
        {
          name: "失敗談 → 気づき → 方法",
          description:
            "（モック）自分の失敗を先に開示して信頼を作り、そこから得た再現可能な方法を渡す型。返信が付きやすい。",
          steps: ["失敗の告白", "失敗の原因", "いまのやり方", "問いかけ"],
          hookHint: "「正直に言います」「失敗しました」で始める",
        },
      ],
      summary: `（モック）@${input.accountHandle} の伸びる投稿は「具体的な数字 × 実体験 × 断言フック」の組み合わせが中心です。抽象的なノウハウ紹介より、1社・1部署の具体例を挙げた投稿が通常比で大きく伸びています。`,
    };
  }

  async scoreDrafts(input: {
    drafts: { label: string; text: string }[];
    genre: string;
  }): Promise<DraftScore[]> {
    return input.drafts.map((draft, index) => {
      const hasNumbers = /\d/.test(draft.text);
      const hasQuestion = /[?？]/.test(draft.text);
      const length = draft.text.length;

      const axes = {
        hook: 7 + (index === 0 ? 2 : 0),
        relevance: 8,
        specificity: hasNumbers ? 8 : 5,
        novelty: 6 + (index === 0 ? 1 : 0),
        credibility: 6 + (index === 1 ? 2 : 0),
        emotion: 6 + (index === 2 ? 2 : 0),
        readability: length < 200 ? 8 : 6,
        shareability: hasNumbers ? 7 : 5,
        cta: hasQuestion ? 7 : 5,
        brandFit: 7,
      };
      const total = Math.min(
        100,
        Math.round(
          (Object.values(axes).reduce((a, b) => a + b, 0) / 100) * 100 + 20,
        ),
      );

      return {
        total,
        axes,
        comment: `（モック）${hasNumbers ? "数字が入っており具体性が強い。" : "数字を1つ入れると具体性が上がる。"}${hasQuestion ? "問いかけで返信を誘発できる。" : ""}`,
      };
    });
  }

  async generateWeeklyReport(input: {
    stats: unknown;
  }): Promise<WeeklyReportResult> {
    const stats = input.stats as {
      postCount?: number;
      bestHook?: string | null;
      bestSlot?: string | null;
    };
    return {
      summary: `（モック）今週は${stats.postCount ?? 0}件投稿しました。具体的な数字と実体験を含む投稿の反応が引き続き高い傾向です。`,
      highlights: [
        "実体験＋数字の投稿がエンゲージメント率で上位",
        stats.bestHook ? `書き出し「${stats.bestHook}」が好調` : "サンプル蓄積中",
      ],
      increase: ["導入事例の具体的な数字", "失敗談からの学びの共有"],
      decrease: ["一般的なAIニュースの紹介"],
      nextActions: [
        stats.bestSlot
          ? `${stats.bestSlot}に次の投稿を予約してください。`
          : "まず今週3件の投稿を予約してください。",
        "外れ値上位の投稿を1件選び、「この型で作る」で次の投稿を生成してください。",
        "反応が高かったテーマを3投稿シリーズに展開してください。",
      ],
    };
  }
}
