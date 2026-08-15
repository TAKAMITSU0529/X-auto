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

  async analyzeTrends(input: {
    genre: string;
    posts: { text: string; likes: number }[];
  }): Promise<TrendAnalysisResult> {
    return {
      risingTopics: [
        `${input.genre} × AIエージェントの実務導入事例`,
        "AI社員・デジタル従業員という切り口",
      ],
      evergreenTopics: ["初心者向けの始め方・手順解説", "失敗談と回避策"],
      saturatedTopics: ["新モデルのニュース速報", "ツール一覧まとめ"],
      opportunityTopics: [
        `中小企業の現場に絞った${input.genre}の定着ノウハウ`,
        "導入コストと回収期間の実数公開",
      ],
      frequentKeywords: ["AIエージェント", "業務削減", "事例", "定着", "コスト"],
      summary: `（モック）「${input.genre}」ではニュース系の発信が飽和する一方、実務の数字を伴う導入事例は発信者が少なく反応が高い傾向です（分析対象 ${input.posts.length} 件）。`,
      postIdeas: [
        {
          title: "導入3ヶ月の実数公開",
          angle: "コスト・削減時間・つまずきを実数で公開し、意思決定者の不安を解消する",
        },
        {
          title: "『ツールは増やすな』逆張り",
          angle: "ツール紹介が飽和している市場で、削減にフォーカスした逆張りで差別化する",
        },
        {
          title: "現場が使い続ける仕組みの作り方",
          angle: "導入ノウハウではなく定着ノウハウに絞り、機会テーマを取りに行く",
        },
      ],
    };
  }

  async scoreCompetitors(input: {
    genre: string;
    candidates: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<CompetitorScore[]> {
    return input.candidates.map((c) => {
      // bioの内容から決定的にそれらしいスコアを付ける
      let score = 50;
      const reasons: string[] = [];
      if (/導入|支援|事例|現場|経営/.test(c.bio)) {
        score += 25;
        reasons.push("実務・事例ベースの発信でジャンル類似性が高い");
      }
      if (/ニュース|速報/.test(c.bio)) {
        score -= 15;
        reasons.push("ニュース系はモデリング価値が低め (飽和テーマ)");
      }
      if (c.followers > 20_000) {
        score += 10;
        reasons.push("フォロワー規模が大きく勝ちパターンの母数が多い");
      }
      if (/講座|スクール|受講/.test(c.bio)) {
        score += 5;
        reasons.push("マネタイズ動線が明確で導線分析の参考になる");
      }
      if (reasons.length === 0) reasons.push("ジャンルとの関連が限定的");
      return {
        handle: c.handle,
        score: Math.max(10, Math.min(95, score)),
        genre: input.genre,
        reasons,
      };
    });
  }

  async analyzePositioning(input: {
    genre: string;
    brand?: unknown;
    competitors: { handle: string; name: string; bio: string; followers: number }[];
  }): Promise<PositioningResult> {
    // bioの内容から決定的にそれらしく配置する
    const placements = input.competitors.slice(0, 8).map((c, i) => {
      const news = /ニュース|速報|最新/.test(c.bio);
      const practice = /導入|支援|事例|現場/.test(c.bio);
      const beginner = /初心者|始め方|入門|学習/.test(c.bio);
      return {
        handle: c.handle,
        x: beginner ? -0.6 + i * 0.05 : 0.3 + (i % 3) * 0.2,
        y: practice ? 0.5 + (i % 2) * 0.2 : news ? -0.7 + (i % 3) * 0.1 : 0,
      };
    });

    return {
      axes: {
        x: { label: "対象読者", low: "初心者向け", high: "実務者・経営者向け" },
        y: { label: "発信内容", low: "情報・ニュース", high: "実務・導入事例" },
      },
      placements,
      recommendedPosition: {
        x: 0.7,
        y: 0.8,
        label: "経営者向け × 実例",
      },
      candidates: [
        {
          name: `中小企業の経営者向け × ${input.genre}の実例発信`,
          score: 88,
          reasons: [
            "ニュース系発信者は多いが実例を数字付きで出す発信者が少ない (競合密度: 低)",
            "意思決定者向けはマネタイズ可能性が高い",
            "本人の支援実績と直結し継続発信できる",
          ],
        },
        {
          name: `${input.genre}ツールのレビュー・比較`,
          score: 52,
          reasons: ["発信者が多く差別化が難しい (競合密度: 高)"],
        },
        {
          name: `初心者向け${input.genre}講座`,
          score: 64,
          reasons: ["需要は大きいがスクール系の強豪が多い"],
        },
      ],
      recommendation: `（モック）「${input.genre}」ではニュース・ツール紹介の発信者が多い一方、経営者向けに導入の実数（コスト・削減時間・失敗）を発信するポジションは比較的空いています。実務支援の実績を持つ発信者に最適な立ち位置です。`,
      profiles: [
        {
          title: "A案：実績前面型",
          name: `山田太郎｜${input.genre}導入支援`,
          bio: `中小企業30社に${input.genre}を導入支援｜平均で月20時間の業務削減｜現場で見た成功と失敗をそのまま発信｜導入相談はプロフィールのリンクから`,
          pinnedPost: `${input.genre}の導入支援で30社を見てきて、成果が出る会社と出ない会社の違いはたった1つでした。\n\nツール選定ではなく「やめる業務」を先に決めているかどうか。\n\nこのアカウントでは現場の実例だけを発信します。`,
          headerCopy: `${input.genre}を「導入した」で終わらせない。現場に定着させる。`,
        },
        {
          title: "B案：ターゲット特化型",
          name: `山田太郎｜経営者のための${input.genre}`,
          bio: `経営者向けに${input.genre}活用を発信｜難しい話はしません｜自社導入で人件費30%削減した方法を公開中｜無料相談は固定ポストから`,
          pinnedPost: `「${input.genre}って結局うちの会社で使えるの？」\n\n経営者からこの質問を100回以上受けました。答えと判断基準をこの固定ポストにまとめます。`,
          headerCopy: "経営判断に必要なAIの知識だけを、実例で。",
        },
        {
          title: "C案：ストーリー型",
          name: `山田太郎｜${input.genre}で会社を変える`,
          bio: `最初の導入は失敗しました｜そこから学んで30社を支援｜失敗談と成功事例をセットで発信する${input.genre}コンサル｜詳しくは固定ポストへ`,
          pinnedPost: `正直に言うと、最初の${input.genre}導入は大失敗でした。\n\n全部署一斉導入で、誰も使わなくなった。\n\nその失敗から学んだ「定着する導入」の全手順を発信していきます。`,
          headerCopy: "失敗から始まった、定着する導入の話。",
        },
      ],
    };
  }

  async generateCustomerInsight(input: {
    who: unknown;
    what: unknown;
    why: unknown;
    how: unknown;
  }): Promise<CustomerInsightResult> {
    const who = (input.who ?? {}) as { industry?: string; problems?: string };
    const target = who.industry || "ターゲット";

    return {
      surfaceProblem:
        who.problems || `（モック）${target}は「AIを使いこなせていない」と感じている`,
      realProblem:
        "（モック）ツールの問題ではなく、業務のどこをやめて何を残すかを決められていないこと",
      emotions: ["焦り", "取り残される不安", "半信半疑"],
      fearedFuture:
        "競合だけが効率化に成功し、自社は人手不足のまま値上げもできず消耗していく未来",
      desiredFuture:
        "少ない人数でも回る体制ができ、自分は本来やりたい仕事に時間を使えている未来",
      whyNotAct:
        "何から始めるのが正解か分からず、失敗して社内の信用を失うのが怖いから",
      whyNotBuy:
        "過去にツール導入で失敗した経験があり、また「導入して終わり」になると思っているから",
      believedNorm: "AI活用は大企業やITに強い会社がやるものだという常識",
      normToBreak:
        "「まず全社導入」ではなく「1部署で小さく回して広げる」方が定着するという新常識",
    };
  }

  async generatePlaybook(input: {
    strategy: unknown;
    insight?: unknown;
    brand?: unknown;
  }): Promise<PlaybookResult> {
    void input;
    return {
      advices: [
        {
          area: "ターゲット市場",
          advice:
            "（モック）「AIに興味がある人全員」ではなく、過去にツール導入で失敗した経験を持つ層に絞ると刺さりやすい",
          action: "bioと固定ポストを「導入失敗経験者向け」の言葉に書き換える",
        },
        {
          area: "USP",
          advice:
            "（モック）ツール紹介ではなく「定着させる手順」を独自資産として前面に出す",
          action: "定着手順を1枚にまとめた無料資料を作り、固定ポストから配布する",
        },
        {
          area: "リスクリバーサル",
          advice:
            "（モック）「失敗したらどうしよう」という不安を先に除去する。無料診断・返金条件・小さく始めるプランが有効",
          action: "無料相談の案内に「合わなければ導入を止める判断もお手伝いします」と明記する",
        },
        {
          area: "LTV・継続",
          advice:
            "（モック）導入支援で終わらせず、定着レビューの月次契約への動線を設計する",
          action: "支援終了1ヶ月後のフォロー面談をパッケージに含める",
        },
        {
          area: "オファー・CTA",
          advice:
            "（モック）投稿ごとにCTAを分ける。教育投稿では資料DL、実績投稿では無料相談に誘導する",
          action: "今週の投稿予定に対しCTAを1つずつ割り当てる",
        },
      ],
      funnel: {
        steps: [
          { label: "X投稿", description: "実例と数字で認知を取る" },
          { label: "プロフィール", description: "USPと無料資料への導線を明記" },
          { label: "無料資料DL", description: "定着手順書でリスト化する" },
          { label: "メール/LINE教育", description: "事例配信で信頼を積む" },
          { label: "無料相談", description: "不安の除去と個別診断" },
          { label: "導入支援契約", description: "本命商品への転換" },
        ],
        note: "（モック）リスト化を挟むことで、Xのアルゴリズム変動に依存しない資産動線になります",
      },
      journey: [
        { stage: "認知", goal: "存在を知ってもらう", postHint: "実数公開・逆張り・失敗談のフックで新規リーチを取る" },
        { stage: "興味", goal: "続きが気になる状態にする", postHint: "How-Toや事例の連載で繰り返し接触する" },
        { stage: "信頼", goal: "この人は本物だと感じてもらう", postHint: "顧客事例・数字付き実績・失敗からの学びを出す" },
        { stage: "比較", goal: "他の選択肢との違いを示す", postHint: "「ツール導入」と「定着支援」の違いを言語化する" },
        { stage: "相談", goal: "無料相談へ一歩踏み出させる", postHint: "相談で得られるものと所要時間を具体的に示す" },
        { stage: "購入", goal: "導入を決断してもらう", postHint: "募集投稿は頻度を絞り、締切と定員を明確にする" },
      ],
    };
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
    const competitors = input.competitors.map((c) => {
      // 公開情報 (bio・URL・投稿) の内容から決定的に分類する
      const school = /講座|スクール|受講|セミナー/.test(c.bio);
      const consult = /支援|コンサル|顧問|導入/.test(c.bio);
      const community = /コミュニティ|サロン/.test(c.bio);
      const monetizationType = school
        ? "講座・スクール"
        : consult
          ? "コンサル・導入支援"
          : community
            ? "コミュニティ"
            : "コンテンツ販売";

      const confirmedFacts: string[] = [];
      if (c.url) confirmedFacts.push(`プロフィールにURLを設置 (${c.url})`);
      if (school) confirmedFacts.push("bio に講座・セミナーへの言及がある");
      if (consult) confirmedFacts.push("bio に支援・コンサルティングの記載がある");
      if (c.ctaPosts.length > 0)
        confirmedFacts.push(`投稿内に誘導 (CTA) を含む投稿が ${c.ctaPosts.length} 件ある`);
      if (confirmedFacts.length === 0)
        confirmedFacts.push("公開プロフィールからは明確な商用導線を確認できない");

      return {
        handle: c.handle,
        monetizationType,
        confirmedFacts,
        estimated: [
          `（モック）${monetizationType}を本命商品として、無料コンテンツでリスト化してから案内する二段構えと推定`,
          "募集は常時ではなく、教育投稿を挟んで期間限定で行うパターンと推定",
        ],
        funnelSteps: [
          { label: "X投稿 (認知)", basis: "confirmed" as const },
          { label: "プロフィール", basis: "confirmed" as const },
          ...(c.url
            ? [{ label: "外部リンク (リスト化)", basis: "confirmed" as const }]
            : [{ label: "リスト化 (LINE/メルマガ)", basis: "estimated" as const }]),
          { label: "教育コンテンツ", basis: "estimated" as const },
          { label: monetizationType, basis: school || consult ? ("confirmed" as const) : ("estimated" as const) },
        ],
      };
    });

    return {
      competitors,
      adaptation: {
        steps: [
          "X投稿: 導入実例と数字で認知を取る",
          "プロフィール: 無料の定着手順書へ誘導",
          "資料DL: メールアドレスでリスト化",
          "メール教育: 事例を週1配信",
          "無料相談: 不安の除去",
          "導入支援契約",
        ],
        reason:
          "（モック）競合の多くは講座への直行動線ですが、あなたの強み（支援実績）は個別相談と相性が良いため、資料→相談を挟む動線が転用に適しています。",
      },
    };
  }
}
