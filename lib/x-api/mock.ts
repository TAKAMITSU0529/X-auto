import type {
  OwnPostMetricsData,
  TimelineOptions,
  XApiClient,
  XPost,
  XPostMetrics,
  XUser,
} from "@/lib/x-api/types";

/**
 * X API のモック実装。
 *
 * X API の認証情報が無い状態でもアプリ全体を通しで動かせるようにするためのもの。
 * 生成データは「大半は平凡・数件が明確な外れ値」という現実的な分布にしてあり、
 * Outlier Score (F-14) が機能していることを目視で確認できる。
 *
 * ハンドル名から決定的に生成するため、同じ @ID なら常に同じ結果が返る。
 */

/** 文字列から決定的なシード値を作る */
function seedFrom(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: 決定的な擬似乱数生成器 */
function createRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOOKS = [
  "9割の人が知らないんですが、",
  "正直に言います。",
  "3年間やってわかった事実。",
  "これ、逆です。",
  "昨日クライアントに言われた一言が刺さった。",
  "結論から書きます。",
  "月商1000万の社長に聞いた話。",
  "失敗しました。",
  "AI導入で一番よく聞かれる質問。",
  "断言します。",
];

const BODIES = [
  "AIツールを導入しても成果が出ない会社には共通点があります。ツールを増やすことが目的になっていて、どの業務を削るのかが決まっていない。まず「やめる業務」を決めるのが先です。",
  "生産性を上げたいなら新しいことを始める前に、いま毎日やっている作業を書き出してみてください。だいたい3割は誰もチェックしていない資料作りに消えています。",
  "採用がうまくいかないと相談されたとき、最初に見るのは求人票ではなく既存社員の離職理由です。入口より出口の方が語ることが多い。",
  "現場にAIを入れるとき、いきなり全社展開をやると必ず失敗します。まず1部署・1業務・1ヶ月。小さく回して事例を作ってから広げる。",
  "「うちの業界は特殊だから」と言われることが多いのですが、話を聞くと8割は他業界と同じ課題でした。特殊なのは業務フローであって課題ではない。",
  "経営者がやるべきは正解を出すことではなく、意思決定の回数を増やすことだと思っています。判断が遅い会社は、間違える前に機会を失っている。",
  "業務改善の相談で一番多いのは「何から手をつければいいかわからない」。answer は単純で、一番人が触っている時間が長い作業から見ます。",
  "無料で使えるツールを10個並べるより、有料の1個を全員が使い切る方が成果は出ます。ツール選定より定着設計。",
  "数字が読めない経営者はいません。読む時間がないだけです。だからダッシュボードは3指標に絞るべきだと思っています。",
  "AIに仕事を奪われる話より、AIを使える人に仕事が集まる話の方が現実的です。実際そうなっています。",
];

const CLOSINGS = [
  "参考になれば。",
  "同じ悩みの人、けっこう多いはず。",
  "詳しくはプロフィールから。",
  "経験ある方いますか？",
  "これだけでも変わります。",
  "",
];

function buildText(rng: () => number): string {
  const hook = HOOKS[Math.floor(rng() * HOOKS.length)];
  const body = BODIES[Math.floor(rng() * BODIES.length)];
  const closing = CLOSINGS[Math.floor(rng() * CLOSINGS.length)];
  return closing ? `${hook}\n\n${body}\n\n${closing}` : `${hook}\n\n${body}`;
}

export class MockXApiClient implements XApiClient {
  async getUserByHandle(handle: string): Promise<XUser | null> {
    const normalized = handle.replace(/^@/, "").trim();
    if (!normalized) return null;

    const rng = createRng(seedFrom(normalized));
    const followers = 3_000 + Math.floor(rng() * 120_000);

    return {
      xUserId: `mock-${seedFrom(normalized)}`,
      handle: normalized,
      displayName: `${normalized}（モック）`,
      profile:
        "中小企業のAI活用・業務改善について発信しています。導入支援の現場で見たことを中心に。",
      profileImageUrl: null,
      url: `https://example.com/${normalized}`,
      followers,
      following: 200 + Math.floor(rng() * 1_500),
      postsCount: 1_000 + Math.floor(rng() * 9_000),
    };
  }

  async getUserTimeline(
    xUserId: string,
    options: TimelineOptions,
  ): Promise<XPost[]> {
    const rng = createRng(seedFrom(xUserId));
    const handle = xUserId.replace(/^mock-/, "user");

    // このアカウントの「通常の」エンゲージメント率のベースライン
    const baselineRate = 0.004 + rng() * 0.006; // 0.4% 〜 1.0%
    const avgImpressions = 8_000 + Math.floor(rng() * 40_000);

    const count = Math.min(options.maxResults, 500);
    const posts: XPost[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const isReply = !options.excludeReplies && rng() < 0.12;
      const isRepost = !options.excludeReposts && rng() < 0.08;

      // 大半は平凡、1割弱が中程度、数%が明確な外れ値になるようにする
      const roll = rng();
      let multiplier: number;
      if (roll > 0.97) {
        multiplier = 5 + rng() * 6; // 明確な外れ値 (通常比 5〜11倍)
      } else if (roll > 0.9) {
        multiplier = 1.8 + rng() * 1.5; // やや伸びた
      } else {
        multiplier = 0.5 + rng() * 0.9; // 平常運転
      }

      const impressions = Math.max(
        500,
        Math.floor(avgImpressions * (0.6 + rng() * 0.9)),
      );
      const engagementRate = baselineRate * multiplier;
      const engagements = Math.max(1, Math.floor(impressions * engagementRate));

      // 内訳をそれらしく分配する
      const likes = Math.floor(engagements * (0.6 + rng() * 0.15));
      const reposts = Math.floor(engagements * (0.1 + rng() * 0.08));
      const quotes = Math.floor(engagements * (0.02 + rng() * 0.03));
      const replies = Math.floor(engagements * (0.05 + rng() * 0.06));
      const bookmarks = Math.max(
        0,
        engagements - likes - reposts - quotes - replies,
      );

      const metrics: XPostMetrics = {
        impressions,
        likes,
        reposts,
        quotes,
        replies,
        bookmarks,
      };

      const postedAt = new Date(
        now - i * (18 + rng() * 30) * 60 * 60 * 1000,
      );

      if (options.since && postedAt < options.since) break;

      posts.push({
        xPostId: `mock-post-${xUserId}-${i}`,
        authorXUserId: xUserId,
        authorHandle: handle,
        text: buildText(rng),
        lang: "ja",
        hasMedia: rng() < 0.25,
        mediaUrls: [],
        isReply,
        isRepost,
        isQuote: rng() < 0.05,
        permalink: `https://x.com/${handle}/status/mock-post-${i}`,
        postedAt,
        metrics,
      });
    }

    return posts.filter((p) => {
      if (options.excludeReplies && p.isReply) return false;
      if (options.excludeReposts && p.isRepost) return false;
      return true;
    });
  }

  async searchPosts(query: string, maxResults: number): Promise<XPost[]> {
    return this.getUserTimeline(`mock-search-${seedFrom(query)}`, {
      maxResults,
    });
  }

  /** ユーザー検索のモック。クエリから決定的に競合候補らしいアカウントを生成する */
  async searchUsers(query: string, maxResults: number): Promise<XUser[]> {
    const rng = createRng(seedFrom(`users-${query}`));
    const keyword = query.split(/\s+/)[0] ?? "AI";
    const archetypes = [
      { suffix: "consul", name: `${keyword}コンサル`, bio: `${keyword}の導入支援を年間30社。中小企業向けに現場目線で発信しています。` },
      { suffix: "labo", name: `${keyword}研究室`, bio: `${keyword}の最新情報を毎日発信。ツールレビュー中心。` },
      { suffix: "ceo", name: `${keyword}経営者`, bio: `自社に${keyword}を導入して人件費を30%削減した経営者。実体験のみ発信。` },
      { suffix: "school", name: `${keyword}スクール`, bio: `${keyword}講座を運営。初心者向けの学習ロードマップを発信。受講生2,000名。` },
      { suffix: "news", name: `${keyword}ニュース`, bio: `${keyword}関連のニュースを速報でお届け。` },
      { suffix: "freelance", name: `${keyword}フリーランス`, bio: `${keyword}を活用して月商7桁。個人での稼ぎ方を発信。` },
      { suffix: "dx", name: `${keyword}×DX支援`, bio: `製造業・建設業向けの${keyword}導入とDX支援。補助金にも詳しいです。` },
      { suffix: "sales", name: `${keyword}営業ハック`, bio: `営業組織への${keyword}導入で商談数2倍。営業マネージャー向け。` },
    ];

    return archetypes.slice(0, Math.min(maxResults, archetypes.length)).map((a) => {
      const handle = `${keyword.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "ai"}_${a.suffix}`;
      return {
        xUserId: `mock-${seedFrom(handle)}`,
        handle,
        displayName: `${a.name}（モック）`,
        profile: a.bio,
        profileImageUrl: null,
        url: `https://example.com/${handle}`,
        followers: 1_000 + Math.floor(rng() * 80_000),
        following: 100 + Math.floor(rng() * 2_000),
        postsCount: 500 + Math.floor(rng() * 8_000),
      };
    });
  }

  async createPost(args: {
    accessToken: string;
    text: string;
    mediaIds?: string[];
    replyToXPostId?: string;
  }): Promise<{ xPostId: string }> {
    return { xPostId: `mock-created-${seedFrom(args.text)}-${Date.now()}` };
  }

  async uploadMediaFromUrl(args: {
    accessToken: string;
    url: string;
  }): Promise<{ mediaId: string }> {
    // 実際のアップロードは行わず、URLから決定的なIDを返す
    return { mediaId: `mock-media-${seedFrom(args.url)}` };
  }

  /**
   * 自己投稿メトリクスのモック。
   * 投稿IDから決定的に生成しつつ、呼び出し時刻に応じて数値が伸びる
   * (スナップショット履歴で成長が見えるようにするため)。
   */
  async getOwnPostMetrics(args: {
    xPostId: string;
    accessToken: string;
  }): Promise<OwnPostMetricsData> {
    const rng = createRng(seedFrom(args.xPostId));
    const baseImpressions = 2_000 + Math.floor(rng() * 20_000);
    const engagementRate = 0.005 + rng() * 0.02;

    // 経過時間に応じた成長カーブ (最初の1日で大半が付く)
    const hoursKey = Math.floor(Date.now() / (30 * 60 * 1000)); // 30分刻みで変化
    const growth = Math.min(1, 0.3 + (hoursKey % 48) / 48);

    const impressions = Math.floor(baseImpressions * growth);
    const engagements = Math.floor(impressions * engagementRate);
    const likes = Math.floor(engagements * 0.65);
    const reposts = Math.floor(engagements * 0.12);
    const quotes = Math.floor(engagements * 0.03);
    const replies = Math.floor(engagements * 0.08);
    const bookmarks = Math.max(0, engagements - likes - reposts - quotes - replies);

    return {
      impressions,
      likes,
      reposts,
      quotes,
      replies,
      bookmarks,
      urlClicks: Math.floor(impressions * 0.004),
      profileClicks: Math.floor(impressions * 0.008),
    };
  }
}
