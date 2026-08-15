import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import { runTrendAnalysis } from "@/lib/trends/service";

/** Phase 3 スライスA の受け入れ確認: トレンド分析 (F-11) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) トレンド分析 (F-11 / TREND RADAR) ===");
  const run = await runTrendAnalysis({
    userId: user.id,
    genre: "生成AI 業務改善",
  });

  assert.ok(run.fetchedCount > 0, "検索結果が0件");
  assert.ok(run.result.risingTopics.length > 0, "Rising が空");
  assert.ok(run.result.opportunityTopics.length > 0, "Opportunity が空");
  assert.ok(run.result.postIdeas.length >= 3, "ネタ候補が3件未満");
  assert.ok(run.result.summary.length > 0);
  console.log(`  ✓ ${run.fetchedCount}件を分析 (query: ${run.query})`);
  console.log(`  ✓ TREND RADAR 4分類 + ネタ候補${run.result.postIdeas.length}件`);
  console.log(`    Rising: ${run.result.risingTopics[0]}`);
  console.log(`    Opportunity: ${run.result.opportunityTopics[0]}`);

  console.log("\n=== 2) api_usage 記録 (検索コスト) ===");
  const searchUsage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "posts.search" },
    orderBy: { createdAt: "desc" },
  });
  const trendUsage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "ai.analyzeTrends" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(searchUsage, "posts.search の記録がない");
  assert.ok(trendUsage, "ai.analyzeTrends の記録がない");
  console.log(
    `  ✓ posts.search ${searchUsage!.units}件 $${Number(searchUsage!.estimatedCostUsd).toFixed(4)} / ai.analyzeTrends $${Number(trendUsage!.estimatedCostUsd).toFixed(4)}`,
  );

  console.log("\n=== 3) 検索 (F-24) の対象データ確認 ===");
  const count = await prisma.post.count({
    where: {
      benchmarkAccount: { list: { userId: user.id } },
      text: { contains: "AI", mode: "insensitive" },
    },
  });
  assert.ok(count > 0, "検索対象の投稿がない");
  console.log(`  ✓ 「AI」を含む取得済み投稿: ${count}件 (DB内検索・APIコスト0)`);

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
