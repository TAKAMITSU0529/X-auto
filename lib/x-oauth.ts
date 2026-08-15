import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/crypto";

/**
 * X OAuth 2.0 (PKCE) の連携フロー (要件定義 F-01 / §4)。
 *
 * X の ID・パスワードをアプリに入力させず、公式の認可フローで接続する。
 * アクセストークン・リフレッシュトークンは AES-256-GCM で暗号化して保存する。
 */

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";

/** 予約投稿・自己分析に必要なスコープ */
export const X_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access", // refresh token の発行に必須
];

export type PkcePair = { verifier: string; challenge: string };

export function generatePkce(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export function buildAuthorizeUrl(args: {
  state: string;
  challenge: string;
}): string {
  if (!env.X_CLIENT_ID) {
    throw new Error(
      "X_CLIENT_ID が設定されていません。X Developer Portal でアプリを作成し .env に設定してください。",
    );
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.X_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.X_OAUTH_REDIRECT_URI);
  url.searchParams.set("scope", X_SCOPES.join(" "));
  url.searchParams.set("state", args.state);
  url.searchParams.set("code_challenge", args.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
};

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  if (!env.X_CLIENT_ID) {
    throw new Error("X_CLIENT_ID が設定されていません。");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Confidential client の場合は Basic 認証を付ける
  if (env.X_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      `${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`,
    ).toString("base64")}`;
  } else {
    body.set("client_id", env.X_CLIENT_ID);
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `X のトークン取得に失敗しました (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(args: {
  code: string;
  verifier: string;
}): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: env.X_OAUTH_REDIRECT_URI,
      code_verifier: args.verifier,
    }),
  );
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

/**
 * 有効なアクセストークンを返す。期限切れが近ければリフレッシュして保存し直す。
 * 予約投稿の worker (スライス4) からもこれを使う。
 */
export async function getValidAccessToken(xAccountId: string): Promise<string> {
  const account = await prisma.xAccount.findUniqueOrThrow({
    where: { id: xAccountId },
  });

  if (!account.accessTokenEncrypted) {
    throw new Error("この X アカウントにはトークンが保存されていません。再認証してください。");
  }

  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000; // 期限5分前から更新

  if (!needsRefresh) {
    return decryptToken(account.accessTokenEncrypted);
  }

  if (!account.refreshTokenEncrypted) {
    throw new Error(
      "アクセストークンの期限が切れており、リフレッシュトークンがありません。再認証してください。",
    );
  }

  const refreshed = await refreshAccessToken(
    decryptToken(account.refreshTokenEncrypted),
  );

  await prisma.xAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      refreshTokenEncrypted: refreshed.refresh_token
        ? encryptToken(refreshed.refresh_token)
        : account.refreshTokenEncrypted,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });

  return refreshed.access_token;
}

/** 認可済みユーザー自身の情報を取得する (連携完了時に handle を保存するため) */
export async function fetchAuthorizedUser(accessToken: string): Promise<{
  xUserId: string;
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
}> {
  const response = await fetch(
    "https://api.x.com/2/users/me?user.fields=profile_image_url",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`連携ユーザーの取得に失敗しました (${response.status})`);
  }

  const json = (await response.json()) as {
    data: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
    };
  };

  return {
    xUserId: json.data.id,
    handle: json.data.username,
    displayName: json.data.name,
    profileImageUrl: json.data.profile_image_url ?? null,
  };
}
