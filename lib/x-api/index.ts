import { ApiType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { recordCachedUsage, withApiGuard } from "@/lib/usage/guard";
import { MockXApiClient } from "@/lib/x-api/mock";
import { RealXApiClient } from "@/lib/x-api/real";
import type {
  OwnPostMetricsData,
  TimelineOptions,
  XApiClient,
  XPost,
  XUser,
} from "@/lib/x-api/types";

export * from "@/lib/x-api/types";
export { XApiError } from "@/lib/x-api/real";

/**
 * 動作モードに応じたクライアントを返す。
 * X_API_MODE=real で認証情報が無い場合は real.ts 側で明示的なエラーになる。
 */
export function createXApiClient(): XApiClient {
  return env.X_API_MODE === "real"
    ? new RealXApiClient()
    : new MockXApiClient();
}

export function isMockMode(): boolean {
  return env.X_API_MODE !== "real";
}

/**
 * ユーザー単位の X API ファサード。
 *
 * アプリ側は必ずこのサービス経由で呼ぶ。ここで
 *   - BUDGET LIMIT の判定と api_usage の記録 (F-25)
 *   - 取得済み投稿のキャッシュ判定 (§7.2)
 * が行われるため、呼び出し箇所ごとにコスト制御を書く必要がない。
 */
export class XApiService {
  private readonly client: XApiClient;

  constructor(private readonly userId: string) {
    this.client = createXApiClient();
  }

  async getUserByHandle(handle: string): Promise<XUser | null> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.x,
      endpoint: "user.lookup",
      units: 1,
      run: async () => ({ result: await this.client.getUserByHandle(handle) }),
    });
  }

  /**
   * タイムラインを取得する。
   *
   * キャッシュ方針 (§7.2): 同じ著者の投稿を TTL 内に十分な件数取得済みなら
   * API を呼ばず DB から返す。API コストの大半は読み取りなのでここが効く。
   */
  async getUserTimeline(
    xUserId: string,
    options: TimelineOptions,
  ): Promise<{ posts: XPost[]; fromCache: boolean }> {
    const cached = await this.readFromCache(xUserId, options);
    if (cached) {
      await recordCachedUsage({
        userId: this.userId,
        apiType: ApiType.x,
        endpoint: "posts.read",
        units: cached.length,
      });
      return { posts: cached, fromCache: true };
    }

    const posts = await withApiGuard({
      userId: this.userId,
      apiType: ApiType.x,
      endpoint: "posts.read",
      units: options.maxResults,
      run: async () => {
        const result = await this.client.getUserTimeline(xUserId, options);
        // 実際に取得できた件数で課金記録を補正する
        return { result, actualUnits: result.length };
      },
    });

    return { posts, fromCache: false };
  }

  async searchPosts(query: string, maxResults: number): Promise<XPost[]> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.x,
      endpoint: "posts.search",
      units: maxResults,
      run: async () => {
        const result = await this.client.searchPosts(query, maxResults);
        return { result, actualUnits: result.length };
      },
    });
  }

  async createPost(args: {
    accessToken: string;
    text: string;
  }): Promise<{ xPostId: string }> {
    const hasUrl = /https?:\/\//.test(args.text);
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.x,
      endpoint: hasUrl ? "posts.createWithUrl" : "posts.create",
      units: 1,
      run: async () => ({ result: await this.client.createPost(args) }),
    });
  }

  /** 自己投稿メトリクスの取得 (Owned Reads は単価が安い。§7.1) */
  async getOwnPostMetrics(args: {
    xPostId: string;
    accessToken: string;
  }): Promise<OwnPostMetricsData> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.x,
      endpoint: "posts.ownRead",
      units: 1,
      run: async () => ({ result: await this.client.getOwnPostMetrics(args) }),
    });
  }

  /**
   * TTL 内に取得済みの投稿があればそれを返す。
   * 「同じユーザーの再取得は既定24時間キャッシュ」(要件定義 F-02 制約)。
   */
  private async readFromCache(
    xUserId: string,
    options: TimelineOptions,
  ): Promise<XPost[] | null> {
    const threshold = new Date(
      Date.now() - env.POST_CACHE_TTL_HOURS * 60 * 60 * 1000,
    );

    const rows = await prisma.post.findMany({
      where: {
        authorXUserId: xUserId,
        fetchedAt: { gte: threshold },
        ...(options.excludeReplies ? { isReply: false } : {}),
        ...(options.excludeReposts ? { isRepost: false } : {}),
        ...(options.since ? { postedAt: { gte: options.since } } : {}),
      },
      orderBy: { postedAt: "desc" },
      take: options.maxResults,
      include: {
        metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      },
    });

    // 要求件数を満たせないならキャッシュとして使わず再取得する
    if (rows.length < options.maxResults) return null;

    return rows.map((row) => {
      const m = row.metrics[0];
      return {
        xPostId: row.xPostId,
        authorXUserId: row.authorXUserId,
        authorHandle: row.authorHandle,
        text: row.text,
        lang: row.lang,
        hasMedia: row.hasMedia,
        mediaUrls: row.mediaUrls,
        isReply: row.isReply,
        isRepost: row.isRepost,
        isQuote: row.isQuote,
        permalink: row.permalink ?? "",
        postedAt: row.postedAt,
        metrics: {
          impressions: m?.impressions ?? 0,
          likes: m?.likes ?? 0,
          reposts: m?.reposts ?? 0,
          quotes: m?.quotes ?? 0,
          replies: m?.replies ?? 0,
          bookmarks: m?.bookmarks ?? 0,
        },
      } satisfies XPost;
    });
  }
}
