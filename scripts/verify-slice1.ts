import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runResearch } from "@/lib/research/service";
import { getBudgetStatus } from "@/lib/usage/guard";
import { BudgetExceededError } from "@/lib/usage/guard";

/** スライス1の受け入れ確認スクリプト */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });
  const fresh = await prisma.benchmarkAccount.findFirstOrThrow({
    where: { handle: "saas_watch", list: { userId: user.id } },
  });

  console.log("=== 1) 未取得アカウントでリサーチ実行（API呼び出し経路）===");
  const r1 = await runResearch({
    userId: user.id,
    benchmarkAccountId: fresh.id,
    params: { maxResults: 50, excludeReplies: true, excludeReposts: true, sinceDays: null },
  });
  console.log(`  取得 ${r1.fetched} 件 / キャッシュ: ${r1.fromCache}`);

  const afterFirst = await getBudgetStatus(user.id);
  console.log(`  今月の推定コスト: $${afterFirst.spentUsd.toFixed(4)}`);

  console.log("\n=== 2) 同じ条件で再実行（24hキャッシュが効くはず）===");
  const r2 = await runResearch({
    userId: user.id,
    benchmarkAccountId: fresh.id,
    params: { maxResults: 50, excludeReplies: true, excludeReposts: true, sinceDays: null },
  });
  console.log(`  取得 ${r2.fetched} 件 / キャッシュ: ${r2.fromCache}`);
  const afterSecond = await getBudgetStatus(user.id);
  console.log(`  今月の推定コスト: $${afterSecond.spentUsd.toFixed(4)}（増分 $${(afterSecond.spentUsd - afterFirst.spentUsd).toFixed(4)}）`);

  console.log("\n=== 3) BUDGET LIMIT を $0.01 に下げて取得停止を確認 ===");
  await prisma.budgetSetting.update({
    where: { userId: user.id },
    data: { monthlyLimitUsd: new Prisma.Decimal(0.01) },
  });
  const other = await prisma.benchmarkAccount.findFirstOrThrow({
    where: { handle: "dx_partner", list: { userId: user.id } },
  });
  try {
    await runResearch({
      userId: user.id,
      benchmarkAccountId: other.id,
      params: { maxResults: 50, excludeReplies: true, excludeReposts: true, sinceDays: null },
    });
    console.log("  ✗ 停止しなかった（想定外）");
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      console.log(`  ✓ BudgetExceededError で停止: ${error.message}`);
    } else {
      throw error;
    }
  }

  console.log("\n=== 3b) BUDGET LIMIT を $0 にした場合も停止するか ===");
  await prisma.budgetSetting.update({
    where: { userId: user.id },
    data: { monthlyLimitUsd: new Prisma.Decimal(0) },
  });
  const zeroStatus = await getBudgetStatus(user.id);
  console.log(`  isExceeded=${zeroStatus.isExceeded} (上限0は「使わせない」の意味)`);
  try {
    await runResearch({
      userId: user.id,
      benchmarkAccountId: other.id,
      params: { maxResults: 50, excludeReplies: true, excludeReposts: true, sinceDays: null },
    });
    console.log("  ✗ 停止しなかった（想定外）");
  } catch (error) {
    console.log(`  ✓ ${error instanceof BudgetExceededError ? "BudgetExceededError で停止" : "想定外のエラー"}`);
  }

  const failedJob = await prisma.researchJob.findFirst({
    where: { userId: user.id, status: "failed" },
    orderBy: { createdAt: "desc" },
  });
  const blockedJobs = await prisma.researchJob.count({
    where: { userId: user.id, benchmarkAccountId: other.id },
  });
  console.log(`  予算ブロック時に作られたジョブ数: ${blockedJobs}（0が期待値）`);

  console.log("\n=== 4) api_usage の記録内容 ===");
  const usage = await prisma.apiUsage.groupBy({
    by: ["apiType", "endpoint", "cached"],
    where: { userId: user.id },
    _sum: { units: true, estimatedCostUsd: true },
    _count: true,
  });
  for (const row of usage) {
    console.log(
      `  ${row.apiType}/${row.endpoint}${row.cached ? "(cache)" : ""}: ${row._count}回 ${row._sum.units}件 $${Number(row._sum.estimatedCostUsd).toFixed(4)}`,
    );
  }

  // 上限を元に戻す
  await prisma.budgetSetting.update({
    where: { userId: user.id },
    data: { monthlyLimitUsd: new Prisma.Decimal(30) },
  });
  console.log("\n上限を $30 に戻しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
