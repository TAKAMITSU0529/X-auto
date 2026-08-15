import type {
  AiProvider,
  DraftResult,
  PostAnalysisResult,
  StructureBlock,
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
}
