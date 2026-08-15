import { ApiType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getBudgetStatus, getOrCreateBudgetSetting } from "@/lib/usage/guard";
import { isMockMode } from "@/lib/x-api";
import { isAiMockMode } from "@/lib/ai";
import {
  Card,
  PageHeader,
  StatTile,
  formatNumber,
  formatPercent,
} from "@/components/ui";
import { BudgetForm } from "./budget-form";

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

export default async function SettingsPage() {
  const userId = await requireUserId();

  const [setting, budget, monthly, today, byEndpoint] = await Promise.all([
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
  ]);

  const monthlySpent = Number(monthly._sum.estimatedCostUsd ?? 0);
  const todaySpent = Number(today._sum.estimatedCostUsd ?? 0);

  // 当月の経過日数から月末の着地を単純に外挿する
  const dayOfMonth = new Date().getUTCDate();
  const projected = (monthlySpent / dayOfMonth) * 30;

  const cachedUnits = byEndpoint
    .filter((r) => r.cached)
    .reduce((sum, r) => sum + (r._sum.units ?? 0), 0);

  return (
    <>
      <PageHeader
        title="設定"
        description="API利用量の確認と BUDGET LIMIT の設定を行います。"
      />

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              BUDGET LIMIT
            </h2>
            <p className="mb-4 text-xs text-ink-500">
              上限に達すると取得系の機能を停止します。X 側の spending limits も
              Developer Console で併せて設定してください。
            </p>
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
              <h2 className="mb-3 text-sm font-semibold text-ink-900">
                内訳（今月）
              </h2>
              {byEndpoint.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">
                  まだ API 呼び出しの記録がありません。
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                      <th className="pb-2 font-medium">エンドポイント</th>
                      <th className="pb-2 text-right font-medium">回数</th>
                      <th className="pb-2 text-right font-medium">件数</th>
                      <th className="pb-2 text-right font-medium">コスト</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {byEndpoint.map((row) => (
                      <tr key={`${row.apiType}-${row.endpoint}-${row.cached}`}>
                        <td className="py-2">
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
                        <td className="py-2 text-right tabular-nums text-ink-600">
                          {formatNumber(row._count)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-ink-600">
                          {formatNumber(row._sum.units ?? 0)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-ink-800">
                          ${Number(row._sum.estimatedCostUsd ?? 0).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-xs text-ink-400">
                コストは推定値です。実際の請求額は X Developer Console
                の料金を正としてください。
              </p>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-ink-900">
                外部API接続
              </h2>
              <dl className="space-y-3 text-sm">
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
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <div>
        <dt className="font-medium text-ink-800">{label}</dt>
        <dd className="mt-0.5 text-xs text-ink-500">
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
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          mock
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {mock ? "モック" : "実データ"}
      </span>
    </div>
  );
}
