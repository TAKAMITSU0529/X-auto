import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { exchangeCode, fetchAuthorizedUser, X_SCOPES } from "@/lib/x-oauth";

/**
 * X OAuth 2.0 のコールバック (F-01)。
 * state 検証 → コード交換 → トークンを暗号化して保存。
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("x_oauth_state")?.value;
  const verifier = cookieStore.get("x_oauth_verifier")?.value;
  cookieStore.delete("x_oauth_state");
  cookieStore.delete("x_oauth_verifier");

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/settings?x=error&reason=${encodeURIComponent(reason)}`, request.url),
    );

  if (error) return fail(error);
  if (!code || !state || !savedState || !verifier) {
    return fail("missing_params");
  }
  if (state !== savedState) return fail("state_mismatch");

  try {
    const token = await exchangeCode({ code, verifier });
    const me = await fetchAuthorizedUser(token.access_token);

    await prisma.xAccount.upsert({
      where: { userId_xUserId: { userId, xUserId: me.xUserId } },
      create: {
        userId,
        xUserId: me.xUserId,
        handle: me.handle,
        displayName: me.displayName,
        profileImageUrl: me.profileImageUrl,
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted: token.refresh_token
          ? encryptToken(token.refresh_token)
          : null,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scopes: token.scope ? token.scope.split(" ") : X_SCOPES,
        lastSyncedAt: new Date(),
      },
      update: {
        handle: me.handle,
        displayName: me.displayName,
        profileImageUrl: me.profileImageUrl,
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted: token.refresh_token
          ? encryptToken(token.refresh_token)
          : undefined,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scopes: token.scope ? token.scope.split(" ") : X_SCOPES,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/settings?x=connected", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message.slice(0, 120) : "unknown");
  }
}
