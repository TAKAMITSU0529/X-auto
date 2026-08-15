import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUserId } from "@/lib/auth";
import { isMockMode } from "@/lib/x-api";
import {
  buildAuthorizeUrl,
  generatePkce,
  generateState,
} from "@/lib/x-oauth";

/**
 * X 連携の開始 (F-01)。
 *
 * real モード: PKCE を生成して X の認可画面へリダイレクトする。
 * mock モード: 実際の OAuth は実行できないため、設定画面に誘導する
 *              (モック連携は設定画面のサーバーアクションで行う)。
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isMockMode()) {
    return NextResponse.redirect(
      new URL("/settings?x=mock-only", request.url),
    );
  }

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 10 * 60,
    path: "/",
  };
  cookieStore.set("x_oauth_state", state, cookieOptions);
  cookieStore.set("x_oauth_verifier", verifier, cookieOptions);

  return NextResponse.redirect(buildAuthorizeUrl({ state, challenge }));
}
