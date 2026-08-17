import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * 認証が必要なパスの先頭。
 * app/(app) 配下の画面と1対1で対応させる (画面を追加したらここにも足す)。
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/chat",
  "/research",
  "/trends",
  "/search",
  "/benchmarks",
  "/library",
  "/competitors",
  "/funnels",
  "/positioning",
  "/strategy",
  "/pillars",
  "/generate",
  "/schedule",
  "/calendar",
  "/analytics",
  "/brand",
  "/knowledge",
  "/posts",
  "/settings",
];

/**
 * ルート保護 (要件定義 F-01)。
 * 未ログインで保護対象にアクセスした場合は /login へ、
 * ログイン済みで /login や /signup にアクセスした場合は /dashboard へ飛ばす。
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user?.id);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // 拡張子付きのリクエスト (public 配下の画像・アイコン・manifest 等) は
  // 保護対象のパスと前方一致しても素通しする。
  // 例: /brand は MY BRAND 画面だが、/assets/logo-lockup.svg は静的ファイル。
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
