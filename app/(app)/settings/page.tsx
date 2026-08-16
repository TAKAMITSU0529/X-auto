import { ApiType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getBudgetStatus, getOrCreateBudgetSetting } from "@/lib/usage/guard";
import { isMockMode } from "@/lib/x-api";
import { isAiMockMode } from "@/lib/ai";
import {
  Card,
  CardHeader,
  EmptyState,
  MeterBar,
  PageHeader,
  StatTile,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { BudgetForm } from "./budget-form";
import { XConnectSection } from "./x-connect-section";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ x?: string; reason?: string }>;
}) {
  const userId = await requireUserId();
  const { x: xStatus, reason: xReason } = await searchParams;

  const [setting, budget, monthly, today, byEndpoint, xAccounts] = await Promise.all([
    getOrCreateBudgetSetting(userId),
    getBudgetStatus(userId),
    prisma.apiUsage.aggregate({
      where: { userId, createdAt: { gte: startOfMonth() } },
      _sum: { units: true, estimatedCostUsd: true },
      _count: true,
    }),
    prisma.apiUsage.aggregate({
      where: { userId, createdAt: { gte: startOfToday() } },
      _sum: { estimatedCostUsd: true },
    }),
    prisma.apiUsage.groupBy({
      by: ["apiType", "endpoint", "cached"],
      where: { userId, createdAt: { gte: startOfMonth() } },
      _sum: { units: true, estimatedCostUsd: true },
      _count: true,
    }),
    prisma.xAccount.findMany({
      where: { userId },
      orderBy: { connectedAt: "asc" },
    }),
  ]);

  const monthlySpent = Number(monthly._sum.estimatedCostUsd ?? 0);
  const todaySpent = Number(today._sum.estimatedCostUsd ?? 0);

  // 当月の経過日数から月末の着地を単純に外挿する
  const dayOfMonth = new Date().getUTCDate();
  const projected = (monthlySpent / dayOfMonth) * 30;

  const cachedUnits = byEndpoint
    .filter((r) => r.cached)
    .reduce((sum, r) => sum + (r._sum.units ?? 0), 0);

  // MeterBar に rose はないため、警告・上限到達はどちらも amber で示し、
  // 深刻度はバー右のラベルで区別する
  const meterTone = budget.isWarning ? "amber" : "brand";

  return (
    <>
      <PageHeader
        eyebrow="設定"
        title="設定"
        description="API利用量の確認と BUDGET LIMIT の設定を行います。"
      />

      <div className="space-y-6">
        <XConnectSection
          accounts={xAccounts.map((a) => ({
            id: a.id,
            handle: a.handle,
            displayName: a.displayName,
            connectedAt: a.connectedAt.toISOString(),
            lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
            tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
            hasToken: Boolean(a.accessTokenEncrypted),
          }))}
          mockMode={isMockMode()}
          status={xStatus}
          reason={xReason}
        />

        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            API USAGE — 今月の利用状況
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="今日"
              value={`$${todaySpent.toFixed(2)}`}
              sub="推定コスト"
            />
            <StatTile
              label="今月"
              value={`$${monthlySpent.toFixed(2)}`}
              sub={`上限 $${budget.limitUsd.toFixed(2)}（${formatPercent(budget.usageRatio, 0)}）`}
              accent
            />
            <StatTile
              label="今月の予想着地"
              value={`$${projected.toFixed(2)}`}
              sub="現在のペースからの外挿"
            />
            <StatTile
              label="キャッシュで節約"
              value={`${formatNumber(cachedUnits)} 件`}
              sub="API呼び出しを回避した件数"
            />
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="BUDGET LIMIT"
              description="上限に達すると取得系の機能を停止します。X 側の spending limits も Developer Console で併せて設定してください。"
            />

            {/* 今の消化状況を、設定値の真上で確認できるようにする */}
            <div className="mb-5 rounded-xl border border-ink-200/70 bg-ink-25 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  今月の消化
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-ink-900">
                  ${monthlySpent.toFixed(2)}
                  <span className="text-ink-400">
                    {" / "}${budget.limitUsd.toFixed(2)}
                  </span>
                </span>
              </div>
              <MeterBar
                ratio={budget.usageRatio}
                tone={meterTone}
                className="mt-2.5"
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500">
                <span className="tabular-nums">
                  使用率 {formatPercent(budget.usageRatio, 0)} · 警告ライン{" "}
                  {formatPercent(budget.warningRatio, 0)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                    budget.isExceeded
                      ? "bg-rose-100 text-rose-700"
                      : budget.isWarning
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {budget.isExceeded
                    ? "上限到達"
                    : budget.isWarning
                      ? "警告ライン超過"
                      : "正常"}
                </span>
              </div>
            </div>

            <BudgetForm
              defaults={{
                monthlyLimitUsd: Number(setting.monthlyLimitUsd),
                warningRatio: Number(setting.warningRatio),
                maxPostsPerResearch: setting.maxPostsPerResearch,
                enforceHardStop: setting.enforceHardStop,
              }}
            />
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="内訳（今月）"
                description="エンドポイントごとの呼び出し回数・件数・推定コスト。"
              />
              {byEndpoint.length === 0 ? (
                <EmptyState
                  title="まだ API 呼び出しの記録がありません"
                  description="リサーチや生成を実行すると、ここにエンドポイントごとの利用状況が記録されます。"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-[11px] font-medium text-ink-500">
                        <th className="pb-2 font-medium">エンドポイント</th>
                        <th className="pb-2 text-right font-medium">回数</th>
                        <th className="pb-2 text-right font-medium">件数</th>
                        <th className="pb-2 text-right font-medium">コスト</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {byEndpoint.map((row) => (
                        <tr key={`${row.apiType}-${row.endpoint}-${row.cached}`}>
                          <td className="py-2.5 text-ink-800">
                            <span className="mr-1.5 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-600">
                              {row.apiType === ApiType.x ? "X" : "AI"}
                            </span>
                            {row.endpoint}
                            {row.cached ? (
                              <span className="ml-1.5 text-xs text-emerald-600">
                                （キャッシュ）
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-ink-600">
                            {formatNumber(row._count)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-ink-600">
                            {formatNumber(row._sum.units ?? 0)}
                          </td>
                          <td className="py-2.5 text-right font-medium tabular-nums text-ink-900">
                            ${Number(row._sum.estimatedCostUsd ?? 0).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                コストは推定値です。実際の請求額は X Developer Console
                の料金を正としてください。
              </p>
            </Card>

            <Card>
              <CardHeader
                title="外部API接続"
                description="モックか実データかで、画面に出る内容が変わります。"
              />
              <dl className="divide-y divide-ink-100">
                <ModeRow
                  label="X API"
                  mock={isMockMode()}
                  envVar="X_API_MODE"
                  realHint="X_BEARER_TOKEN などの認証情報が必要です"
                />
                <ModeRow
                  label="AI (Claude)"
                  mock={isAiMockMode()}
                  envVar="AI_MODE"
                  realHint="ANTHROPIC_API_KEY が必要です"
                />
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function ModeRow({
  label,
  mock,
  envVar,
  realHint,
}: {
  label: string;
  mock: boolean;
  envVar: string;
  realHint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <dt className="text-[13px] font-semibold text-ink-900">{label}</dt>
        <dd className="mt-0.5 text-xs leading-relaxed text-ink-500">
          {mock ? (
            <>
              <code className="rounded bg-ink-100 px-1">{envVar}=real</code>
              {" にすると実データに切り替わります。"}
              {realHint}
            </>
          ) : (
            "実データモードで動作中"
          )}
        </dd>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          mock ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {mock ? "モック" : "実データ"}
      </span>
    </div>
  );
}
