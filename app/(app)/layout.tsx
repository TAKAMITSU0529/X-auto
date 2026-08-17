import { redirect } from "next/navigation";
import { getCurrentUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBudgetStatus } from "@/lib/usage/guard";
import { isMockMode } from "@/lib/x-api";
import { isAiMockMode } from "@/lib/ai";
import { Sidebar } from "@/components/sidebar";
import { IconAlert, IconLogout, IconSparkle } from "@/components/icons";

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
  const meterRatio = Math.min(1, Math.max(0, budget.usageRatio));

  return (
    <div className="min-h-screen">
      <Sidebar
        footer={
          <div className="space-y-3">
            {/* API利用状況 (F-25)。常に視界に入る位置に置いてコスト意識を保つ */}
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  今月のAPI利用
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-ink-300">
                  ${budget.spentUsd.toFixed(2)}
                  <span className="text-ink-500">
                    {" "}
                    / ${budget.limitUsd.toFixed(0)}
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budget.isExceeded
                      ? "bg-rose-400"
                      : budget.isWarning
                        ? "bg-amber-400"
                        : "bg-brand-400"
                  }`}
                  style={{ width: `${Math.max(2, meterRatio * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-600 to-ink-800 text-[11px] font-semibold text-white">
                {(user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink-200">
                  {user?.name ?? "ユーザー"}
                </span>
                <span className="block truncate text-[10px] text-ink-500">
                  {user?.email}
                </span>
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  title="ログアウト"
                  aria-label="ログアウト"
                  className="rounded-lg p-2 text-ink-500 transition hover:bg-white/10 hover:text-white"
                >
                  <IconLogout className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        }
      />

      <div className="lg:pl-[264px]">
        {mockActive || budget.isWarning ? (
          <div className="space-y-px">
            {mockActive ? (
              <Banner tone="info" icon={<IconSparkle className="h-4 w-4" />}>
                <strong className="font-semibold">モックモード動作中</strong>
                {" — "}
                {isMockMode() ? "X API" : null}
                {isMockMode() && isAiMockMode() ? " と " : null}
                {isAiMockMode() ? "AI" : null}
                {" は実際には呼び出されず、サンプルデータを表示しています。"}
                <code className="ml-1 rounded bg-black/[0.06] px-1.5 py-0.5 text-[11px]">
                  .env
                </code>
                {" の X_API_MODE / AI_MODE を real にすると実データに切り替わります。"}
              </Banner>
            ) : null}

            {budget.isWarning ? (
              <Banner
                tone={budget.isExceeded ? "danger" : "warning"}
                icon={<IconAlert className="h-4 w-4" />}
              >
                {budget.isExceeded ? (
                  <>
                    <strong className="font-semibold">
                      API利用上限に到達しました
                    </strong>
                    {` — 今月 $${budget.spentUsd.toFixed(2)} / 上限 $${budget.limitUsd.toFixed(2)}。取得系の機能は停止しています。`}
                  </>
                ) : (
                  <>
                    <strong className="font-semibold">
                      API利用が警告ラインを超えました
                    </strong>
                    {` — 今月 $${budget.spentUsd.toFixed(2)} / 上限 $${budget.limitUsd.toFixed(2)}`}
                  </>
                )}
              </Banner>
            ) : null}
          </div>
        ) : null}

        <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "info" | "warning" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-brand-100 bg-brand-50/70 text-brand-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];

  return (
    <div className={`border-b ${styles}`}>
      <div className="mx-auto flex max-w-[1400px] items-start gap-2 px-5 py-2.5 text-[12px] leading-relaxed lg:px-10">
        <span className="mt-px shrink-0 opacity-70">{icon}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}
