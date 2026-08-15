import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import { runPositioning } from "@/lib/positioning/service";

/** Phase 3 スライスC の受け入れ確認: ポジショニング分析 (F-12) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) ポジショニング分析 + プロフィール3案 ===");
  const { result, competitorCount } = await runPositioning({
    userId: user.id,
    genre: "AI業務改善",
  });

  assert.ok(result.axes.x.label && result.axes.y.label, "軸が提案されていない");
  assert.ok(result.placements.length >= 3, "競合の配置が3件未満");
  assert.ok(
    result.placements.every(
      (p) => p.x >= -1.5 && p.x <= 1.5 && p.y >= -1.5 && p.y <= 1.5,
    ),
    "座標が異常値",
  );
  assert.ok(result.recommendedPosition.label, "推奨ポジションが無い");
  assert.ok(result.candidates.length >= 2, "ポジショニング候補が2件未満");
  assert.ok(
    result.candidates.every((c) => c.score >= 0 && c.score <= 100),
    "候補スコアが範囲外",
  );
  assert.strictEqual(result.profiles.length, 3, "プロフィールが3案でない");
  for (const profile of result.profiles) {
    assert.ok(profile.name && profile.bio && profile.pinnedPost, "プロフィール項目に欠落");
  }
  console.log(`  ✓ 競合${competitorCount}件を分析`);
  console.log(`  ✓ 軸: ${result.axes.x.label} × ${result.axes.y.label}`);
  console.log(`  ✓ 推奨: ${result.recommendedPosition.label}`);
  console.log(`  ✓ 候補${result.candidates.length}件 (トップ ${result.candidates[0].score}点) / プロフィール3案`);

  console.log("\n=== 2) 競合不足時の明示エラー ===");
  // 競合の少ない新規ユーザーを一時作成して確認
  const temp = await prisma.user.create({
    data: {
      email: `temp-${Date.now()}@example.com`,
      passwordHash: "x",
      name: "temp",
    },
  });
  let rejected = false;
  try {
    await runPositioning({ userId: temp.id, genre: "AI" });
  } catch (e) {
    rejected = e instanceof Error && e.message.includes("3アカウント以上");
  }
  await prisma.user.delete({ where: { id: temp.id } });
  assert.ok(rejected, "競合不足のエラーが出ていない");
  console.log("  ✓ 競合不足時は案内付きエラー");

  console.log("\n=== 3) api_usage 記録 ===");
  const usage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "ai.positioning" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(usage, "ai.positioning の記録がない");
  console.log(`  ✓ ai.positioning $${Number(usage!.estimatedCostUsd).toFixed(4)}`);

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
