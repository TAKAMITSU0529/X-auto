import { env } from "@/lib/env";
import type {
  OwnPostMetricsData,
  TimelineOptions,
  XApiClient,
  XPost,
  XUser,
} from "@/lib/x-api/types";

/**
 * X API v2 の実装。
 *
 * 注意: 要件定義 §7.4 の通り、データ取得は必ず公式 API 経由で行う
 * (スクレイピングは規約違反)。レート制限は 429 のハンドリングで対応する。
 */

const API_BASE = "https://api.x.com/2";

export class XApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "XApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type FetchOptions = {
  token: string;
  searchParams?: Record<string, string | undefined>;
  method?: "GET" | "POST";
  body?: unknown;
};

async function callXApi<T>(
  path: string,
  { token, searchParams, method = "GET", body }: FetchOptions,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    throw new XApiError(
      429,
      "X API のレート制限に達しました。時間をおいて再実行してください。",
      retryAfter ? Number(retryAfter) : undefined,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new XApiError(
      response.status,
      `X API リクエストが失敗しました (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  return (await response.json()) as T;
}

/** アプリ単位の読み取りに使う Bearer トークン */
function appToken(): string {
  if (!env.X_BEARER_TOKEN) {
    throw new XApiError(
      401,
      "X_BEARER_TOKEN が設定されていません。X_API_MODE=real で動かすには .env に認証情報が必要です。",
    );
  }
  return env.X_BEARER_TOKEN;
}

type ApiUser = {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
};

type ApiPost = {
  id: string;
  text: string;
  author_id: string;
  lang?: string;
  created_at: string;
  referenced_tweets?: { type: "replied_to" | "retweeted" | "quoted" }[];
  attachments?: { media_keys?: string[] };
  public_metrics?: {
    impression_count?: number;
    like_count: number;
    retweet_count: number;
    quote_count?: number;
    reply_count: number;
    bookmark_count?: number;
  };
};

const USER_FIELDS =
  "description,profile_image_url,url,public_metrics,verified";
const POST_FIELDS =
  "created_at,author_id,lang,public_metrics,referenced_tweets,attachments";

function toXPost(raw: ApiPost, authorHandle: string): XPost {
  const refs = raw.referenced_tweets ?? [];
  const m = raw.public_metrics;

  return {
    xPostId: raw.id,
    authorXUserId: raw.author_id,
    authorHandle,
    text: raw.text,
    lang: raw.lang ?? null,
    hasMedia: Boolean(raw.attachments?.media_keys?.length),
    mediaUrls: [],
    isReply: refs.some((r) => r.type === "replied_to"),
    isRepost: refs.some((r) => r.type === "retweeted"),
    isQuote: refs.some((r) => r.type === "quoted"),
    permalink: `https://x.com/${authorHandle}/status/${raw.id}`,
    postedAt: new Date(raw.created_at),
    metrics: {
      impressions: m?.impression_count ?? 0,
      likes: m?.like_count ?? 0,
      reposts: m?.retweet_count ?? 0,
      quotes: m?.quote_count ?? 0,
      replies: m?.reply_count ?? 0,
      bookmarks: m?.bookmark_count ?? 0,
    },
  };
}

export class RealXApiClient implements XApiClient {
  async getUserByHandle(handle: string): Promise<XUser | null> {
    const normalized = handle.replace(/^@/, "").trim();
    const data = await callXApi<{ data?: ApiUser }>(
      `/users/by/username/${encodeURIComponent(normalized)}`,
      { token: appToken(), searchParams: { "user.fields": USER_FIELDS } },
    );

    if (!data.data) return null;
    const u = data.data;

    return {
      xUserId: u.id,
      handle: u.username,
      displayName: u.name,
      profile: u.description ?? null,
      profileImageUrl: u.profile_image_url ?? null,
      url: u.url ?? null,
      followers: u.public_metrics?.followers_count ?? 0,
      following: u.public_metrics?.following_count ?? 0,
      postsCount: u.public_metrics?.tweet_count ?? 0,
    };
  }

  async getUserTimeline(
    xUserId: string,
    options: TimelineOptions,
  ): Promise<XPost[]> {
    // 著者ハンドルを permalink 生成に使うため先に引く
    const author = await callXApi<{ data?: ApiUser }>(`/users/${xUserId}`, {
      token: appToken(),
    });
    const handle = author.data?.username ?? xUserId;

    const exclude: string[] = [];
    if (options.excludeReplies) exclude.push("replies");
    if (options.excludeReposts) exclude.push("retweets");

    const posts: XPost[] = [];
    let paginationToken: string | undefined;

    // X API の 1 リクエストあたり上限は 100 件。必要数に達するまでページングする。
    while (posts.length < options.maxResults) {
      const remaining = options.maxResults - posts.length;
      const pageSize = Math.min(100, Math.max(5, remaining));

      const page = await callXApi<{
        data?: ApiPost[];
        meta?: { next_token?: string };
      }>(`/users/${xUserId}/tweets`, {
        token: appToken(),
        searchParams: {
          max_results: String(pageSize),
          "tweet.fields": POST_FIELDS,
          exclude: exclude.length ? exclude.join(",") : undefined,
          start_time: options.since?.toISOString(),
          pagination_token: paginationToken,
        },
      });

      const batch = page.data ?? [];
      posts.push(...batch.map((p) => toXPost(p, handle)));

      paginationToken = page.meta?.next_token;
      if (!paginationToken || batch.length === 0) break;
    }

    return posts.slice(0, options.maxResults);
  }

  async searchPosts(query: string, maxResults: number): Promise<XPost[]> {
    const page = await callXApi<{ data?: ApiPost[]; includes?: { users?: ApiUser[] } }>(
      "/tweets/search/recent",
      {
        token: appToken(),
        searchParams: {
          query,
          max_results: String(Math.min(100, maxResults)),
          "tweet.fields": POST_FIELDS,
          expansions: "author_id",
          "user.fields": USER_FIELDS,
        },
      },
    );

    const handleById = new Map(
      (page.includes?.users ?? []).map((u) => [u.id, u.username]),
    );

    return (page.data ?? []).map((p) =>
      toXPost(p, handleById.get(p.author_id) ?? p.author_id),
    );
  }

  /** ユーザー検索 (F-08)。名前・ユーザー名・プロフィールから検索できる */
  async searchUsers(query: string, maxResults: number): Promise<XUser[]> {
    const page = await callXApi<{ data?: ApiUser[] }>("/users/search", {
      token: appToken(),
      searchParams: {
        query,
        max_results: String(Math.min(100, maxResults)),
        "user.fields": USER_FIELDS,
      },
    });

    return (page.data ?? []).map((u) => ({
      xUserId: u.id,
      handle: u.username,
      displayName: u.name,
      profile: u.description ?? null,
      profileImageUrl: u.profile_image_url ?? null,
      url: u.url ?? null,
      followers: u.public_metrics?.followers_count ?? 0,
      following: u.public_metrics?.following_count ?? 0,
      postsCount: u.public_metrics?.tweet_count ?? 0,
    }));
  }

  async createPost(args: {
    accessToken: string;
    text: string;
  }): Promise<{ xPostId: string }> {
    const result = await callXApi<{ data: { id: string } }>("/tweets", {
      token: args.accessToken,
      method: "POST",
      body: { text: args.text },
    });
    return { xPostId: result.data.id };
  }

  /**
   * 自分の投稿のメトリクス取得。ユーザーコンテキストのトークンが必要。
   * non_public_metrics (URLクリック・プロフィールクリック) は投稿後30日を
   * 過ぎると取得できないため、その場合は public_metrics のみで null を返す。
   */
  async getOwnPostMetrics(args: {
    xPostId: string;
    accessToken: string;
  }): Promise<OwnPostMetricsData> {
    type MetricsResponse = {
      data?: {
        public_metrics?: {
          impression_count?: number;
          like_count: number;
          retweet_count: number;
          quote_count?: number;
          reply_count: number;
          bookmark_count?: number;
        };
        non_public_metrics?: {
          impression_count?: number;
          url_link_clicks?: number;
          user_profile_clicks?: number;
        };
      };
    };

    const fetchWith = (fields: string) =>
      callXApi<MetricsResponse>(`/tweets/${args.xPostId}`, {
        token: args.accessToken,
        searchParams: { "tweet.fields": fields },
      });

    let response: MetricsResponse;
    try {
      response = await fetchWith("public_metrics,non_public_metrics");
    } catch (error) {
      // 30日超過・権限不足では non_public_metrics 指定自体がエラーになるため
      // public_metrics だけで取り直す
      if (error instanceof XApiError && error.status < 500) {
        response = await fetchWith("public_metrics");
      } else {
        throw error;
      }
    }

    const pub = response.data?.public_metrics;
    const priv = response.data?.non_public_metrics;

    return {
      impressions: priv?.impression_count ?? pub?.impression_count ?? 0,
      likes: pub?.like_count ?? 0,
      reposts: pub?.retweet_count ?? 0,
      quotes: pub?.quote_count ?? 0,
      replies: pub?.reply_count ?? 0,
      bookmarks: pub?.bookmark_count ?? 0,
      urlClicks: priv?.url_link_clicks ?? null,
      profileClicks: priv?.user_profile_clicks ?? null,
    };
  }
}
