import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBudgetStatus } from "@/lib/usage/guard";
import { isMockMode } from "@/lib/x-api";
import { isAiMockMode } from "@/lib/ai";
import { NavLink } from "@/components/nav-link";

const NAV = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/benchmarks", label: "ベンチマーク" },
  { href: "/competitors", label: "競合発見" },
  { href: "/funnels", label: "動線分析" },
  { href: "/positioning", label: "ポジショニング" },
  { href: "/strategy", label: "戦略" },
  { href: "/pillars", label: "ピラー" },
  { href: "/research", label: "リサーチ" },
  { href: "/trends", label: "トレンド" },
  { href: "/search", label: "検索" },
  { href: "/library", label: "ライブラリ" },
  { href: "/generate", label: "生成スタジオ" },
  { href: "/schedule", label: "予約投稿" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/analytics", label: "自己分析" },
  { href: "/brand", label: "MY BRAND" },
  { href: "/knowledge", label: "ナレッジ" },
  { href: "/settings", label: "設定" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [user, budget] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getBudgetStatus(userId),
  ]);

  const mockActive = isMockMode() || isAiMockMode();

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-ink-900">
            X AUTO
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-500">{user?.name ?? user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      {mockActive ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-6 py-2 text-xs text-amber-800">
            <strong className="font-semibold">モックモード動作中</strong>
            {" — "}
            {isMockMode() ? "X API" : null}
            {isMockMode() && isAiMockMode() ? " と " : null}
            {isAiMockMode() ? "AI" : null}
            {" は実際には呼び出されず、サンプルデータを表示しています。"}
            <code className="ml-1 rounded bg-amber-100 px-1">.env</code>
            {" の X_API_MODE / AI_MODE を real にすると実データに切り替わります。"}
          </div>
        </div>
      ) : null}

      {budget.isWarning ? (
        <div
          className={`border-b ${
            budget.isExceeded
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-orange-200 bg-orange-50 text-orange-800"
          }`}
        >
          <div className="mx-auto max-w-7xl px-6 py-2 text-xs">
            {budget.isExceeded ? (
              <>
                <strong className="font-semibold">API利用上限に到達しました</strong>
                {` — 今月 $${budget.spentUsd.toFixed(2)} / 上限 $${budget.limitUsd.toFixed(2)}。取得系の機能は停止しています。`}
              </>
            ) : (
              <>
                <strong className="font-semibold">API利用が警告ラインを超えました</strong>
                {` — 今月 $${budget.spentUsd.toFixed(2)} / 上限 $${budget.limitUsd.toFixed(2)}`}
              </>
            )}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
