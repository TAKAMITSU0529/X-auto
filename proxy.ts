import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** 認証が必要なパスの先頭 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/research",
  "/benchmarks",
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
