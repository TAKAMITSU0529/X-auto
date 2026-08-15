import { ApiType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  estimateAiCost,
  estimateXCost,
  type AiCostKey,
  type XCostKey,
} from "@/lib/usage/cost";

/**
 * 外部API呼び出しのガード (要件定義 F-25 / §7)。
 *
 * すべての外部呼び出しはこの関数を経由させる。ここに集約することで
 *   1. BUDGET LIMIT の判定 (上限超過なら実行しない)
 *   2. 実行
 *   3. api_usage への記録
 * が呼び出し箇所に依存せず必ず行われる。
 *
 * キャッシュ判定は取得内容ごとに条件が異なるため呼び出し側 (lib/x-api) が行い、
 * キャッシュヒット時は recordCachedUsage() でコスト0の記録だけを残す。
 */

export class BudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly limitUsd: number;

  constructor(spentUsd: number, limitUsd: number) {
    super(
      `今月の API 利用上限に達しました (使用 $${spentUsd.toFixed(2)} / 上限 $${limitUsd.toFixed(2)})。設定画面から上限を引き上げるか、翌月までお待ちください。`,
    );
    this.name = "BudgetExceededError";
    this.spentUsd = spentUsd;
    this.limitUsd = limitUsd;
  }
}

export type BudgetStatus = {
  spentUsd: number;
  limitUsd: number;
  warningRatio: number;
  /** 上限に対する使用割合 (0-1+) */
  usageRatio: number;
  /** 警告ラインを超えているか */
  isWarning: boolean;
  /** 上限に達しているか */
  isExceeded: boolean;
  enforceHardStop: boolean;
  maxPostsPerResearch: number;
};

/** 当月の開始時刻 (UTC基準) */
function startOfMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** ユーザーの BUDGET 設定を取得する。無ければ既定値で作成する。 */
export async function getOrCreateBudgetSetting(userId: string) {
  const existing = await prisma.budgetSetting.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.budgetSetting.create({
    data: {
      userId,
      monthlyLimitUsd: new Prisma.Decimal(env.DEFAULT_MONTHLY_BUDGET_USD),
      warningRatio: new Prisma.Decimal(env.DEFAULT_BUDGET_WARNING_RATIO),
    },
  });
}

/** 当月の利用額と上限の状態を返す (設定画面・ガード双方から使う)。 */
export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const setting = await getOrCreateBudgetSetting(userId);

  const aggregate = await prisma.apiUsage.aggregate({
    where: { userId, createdAt: { gte: startOfMonth() } },
    _sum: { estimatedCostUsd: true },
  });

  const spentUsd = Number(aggregate._sum.estimatedCostUsd ?? 0);
  const limitUsd = Number(setting.monthlyLimitUsd);
  const warningRatio = Number(setting.warningRatio);

  // 上限 0 は「1セントも使わせない」の意味として扱う。
  // ここで除算を避けて 0 を返してしまうと、上限 0 のときに一切停止しない
  // (= 保護が無効になる) という逆の挙動になるため、明示的に分けている。
  const usageRatio = limitUsd > 0 ? spentUsd / limitUsd : 1;
  const isExceeded = limitUsd <= 0 || spentUsd >= limitUsd;

  return {
    spentUsd,
    limitUsd,
    warningRatio,
    usageRatio,
    isWarning: isExceeded || usageRatio >= warningRatio,
    isExceeded,
    enforceHardStop: setting.enforceHardStop,
    maxPostsPerResearch: setting.maxPostsPerResearch,
  };
}

type GuardArgs<T> = {
  userId: string;
  apiType: ApiType;
  endpoint: string;
  /** 課金単位となる数量 (取得件数など)。実行前の見積り値。 */
  units: number;
  /** 実際の呼び出し。戻り値の actualUnits があれば記録をそれで上書きする。 */
  run: () => Promise<{ result: T; actualUnits?: number }>;
};

/**
 * BUDGET 判定 → 実行 → api_usage 記録 を一括で行う。
 *
 * @throws {BudgetExceededError} 上限に達しており enforceHardStop が有効な場合
 */
export async function withApiGuard<T>({
  userId,
  apiType,
  endpoint,
  units,
  run,
}: GuardArgs<T>): Promise<T> {
  const status = await getBudgetStatus(userId);

  if (status.isExceeded && status.enforceHardStop) {
    throw new BudgetExceededError(status.spentUsd, status.limitUsd);
  }

  const { result, actualUnits } = await run();
  const recordedUnits = actualUnits ?? units;

  const estimatedCostUsd =
    apiType === ApiType.x
      ? estimateXCost(endpoint as XCostKey, recordedUnits)
      : estimateAiCost(endpoint as AiCostKey, recordedUnits);

  await prisma.apiUsage.create({
    data: {
      userId,
      apiType,
      endpoint,
      units: recordedUnits,
      estimatedCostUsd: new Prisma.Decimal(estimatedCostUsd),
      cached: false,
    },
  });

  return result;
}

/**
 * キャッシュから返した場合の記録 (コスト0)。
 * 「キャッシュが何件のAPI呼び出しを節約したか」を可視化するために残す (§7.2)。
 */
export async function recordCachedUsage(args: {
  userId: string;
  apiType: ApiType;
  endpoint: string;
  units: number;
}): Promise<void> {
  await prisma.apiUsage.create({
    data: {
      userId: args.userId,
      apiType: args.apiType,
      endpoint: args.endpoint,
      units: args.units,
      estimatedCostUsd: new Prisma.Decimal(0),
      cached: true,
    },
  });
}
