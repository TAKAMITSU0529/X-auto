/**
 * X API のドメイン型。
 *
 * X API v2 のレスポンス形状をそのまま使わず、アプリ内部の型に変換して扱う。
 * こうしておくことで API の仕様変更の影響を lib/x-api/real.ts に閉じ込められる
 * (要件定義 §12「API アクセス層を抽象化し変更に強い設計に」)。
 */

export type XUser = {
  xUserId: string;
  handle: string;
  displayName: string;
  profile: string | null;
  profileImageUrl: string | null;
  url: string | null;
  followers: number;
  following: number;
  postsCount: number;
};

export type XPostMetrics = {
  impressions: number;
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  bookmarks: number;
};

export type XPost = {
  xPostId: string;
  authorXUserId: string;
  authorHandle: string;
  text: string;
  lang: string | null;
  hasMedia: boolean;
  mediaUrls: string[];
  isReply: boolean;
  isRepost: boolean;
  isQuote: boolean;
  permalink: string;
  postedAt: Date;
  metrics: XPostMetrics;
};

export type TimelineOptions = {
  /** 取得件数の上限 */
  maxResults: number;
  /** リプライを除外する */
  excludeReplies?: boolean;
  /** リポストを除外する */
  excludeReposts?: boolean;
  /** この日時以降の投稿のみ取得する */
  since?: Date;
};

/**
 * X API クライアントのインターフェース。
 * 実装は real.ts (X API v2) と mock.ts (フィクスチャ) の2つ。
 */
export interface XApiClient {
  /** @handle からユーザー情報を取得する */
  getUserByHandle(handle: string): Promise<XUser | null>;

  /** ユーザーのタイムラインを取得する (ページングは実装側で処理) */
  getUserTimeline(
    xUserId: string,
    options: TimelineOptions,
  ): Promise<XPost[]>;

  /** キーワードで投稿を検索する (直近7日・要件定義 F-11) */
  searchPosts(query: string, maxResults: number): Promise<XPost[]>;

  /** 投稿を作成する (F-07 予約投稿から呼ばれる) */
  createPost(args: {
    accessToken: string;
    text: string;
  }): Promise<{ xPostId: string }>;
}

/** 総エンゲージメント数 */
export function totalEngagement(m: XPostMetrics): number {
  return m.likes + m.reposts + m.quotes + m.replies + m.bookmarks;
}
