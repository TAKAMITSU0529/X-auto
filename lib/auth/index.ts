import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

/**
 * 認証設定 (要件定義 F-01)。
 *
 * Credentials プロバイダは JWT セッション戦略が前提であり DB セッションを
 * 使わないため、Prisma アダプタは不要。ユーザー照合は authorize() 内で
 * Prisma を直接使う。
 *
 * X アカウントとの連携は OAuth 2.0 (PKCE) の専用フローとして別途実装する
 * (API 呼び出し用のトークンを自前で暗号化保存する必要があるため)。
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/**
 * ログイン中のユーザーIDを返す。未ログインなら null。
 * Server Component / Server Action / Route Handler から使う。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * ログイン必須の処理で使う。未ログインなら例外を投げる。
 * ルート自体の保護は middleware.ts が行うため、これは多層防御。
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("認証が必要です。");
  }
  return userId;
}
