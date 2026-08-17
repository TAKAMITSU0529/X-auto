import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  classifyPost,
  computePillarBalance,
  savePillarSetting,
} from "@/lib/pillars/service";
import { runFunnelAnalysis } from "@/lib/funnels/service";

/** Phase 3 スライスE の受け入れ確認: CONTENT PILLARS (F-18) / 動線分析 (F-13) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) CONTENT PILLARS の保存とバリデーション ===");
  let rejected = false;
  try {
    await savePillarSetting({
      userId: user.id,
      pillars: [
        { name: "A", ratio: 70, keywords: [] },
        { name: "B", ratio: 40, keywords: [] },
      ],
      purposeRatios: {},
    });
  } catch (e) {
    rejected = e instanceof Error && e.message.includes("100%");
  }
  assert.ok(rejected, "比率合計超過が拒否されていない");
  console.log("  ✓ 比率合計 > 100% は明示エラー");

  await savePillarSetting({
    userId: user.id,
    pillars: [
      { name: "AI導入事例", ratio: 40, keywords: ["導入", "事例", "削減"] },
      { name: "業務改善ノウハウ", ratio: 30, keywords: ["業務", "改善", "効率"] },
      { name: "経営の考え方", ratio: 30, keywords: ["経営", "判断", "投資"] },
    ],
    purposeRatios: {
      reach: 30,
      authority: 25,
      trust: 20,
      education: 15,
      conversion: 10,
    },
  });
  const setting = await prisma.contentPillarSetting.findUniqueOrThrow({
    where: { userId: user.id },
  });
  assert.ok(setting.pillarsJson, "柱が保存されていない");
  console.log("  ✓ 柱3本 + 目的別比率を保存 (upsert)");

  console.log("\n=== 2) ルールベース分類 (DATA・AIコスト0) ===");
  assert.strictEqual(
    classifyPost("製造業の導入事例。月20時間削減した", [
      { name: "AI導入事例", ratio: 40, keywords: ["導入", "事例", "削減"] },
      { name: "経営の考え方", ratio: 30, keywords: ["経営"] },
    ]),
    "AI導入事例",
    "分類が想定と異なる",
  );
  assert.strictEqual(
    classifyPost("今日は良い天気", [
      { name: "AI導入事例", ratio: 40, keywords: ["導入"] },
    ]),
    null,
    "無関係な投稿が未分類になっていない",
  );
  console.log("  ✓ キーワード最多一致の柱に分類・無関係は未分類");

  console.log("\n=== 3) 実投稿とのズレ計算 ===");
  const aiUsageBefore = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "ai" },
  });
  const report = await computePillarBalance(user.id);
  assert.ok(report, "レポートが生成されていない");
  assert.strictEqual(report!.balances.length, 3, "柱の数が一致しない");
  assert.ok(report!.totalPosts > 0, "自己投稿が分析されていない");
  for (const b of report!.balances) {
    assert.strictEqual(
      b.gap,
      b.targetRatio - b.actualRatio,
      "ズレの計算が不正",
    );
  }
  const aiUsageAfter = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "ai" },
  });
  assert.strictEqual(aiUsageBefore, aiUsageAfter, "分類でAIコストが発生している");
  console.log(
    `  ✓ 自己投稿${report!.totalPosts}件を分類 (未分類${report!.unclassified}件)、AI呼び出し0`,
  );
  if (report!.mostLacking) {
    console.log(
      `  ✓ 最不足の柱: ${report!.mostLacking.name} (${report!.mostLacking.gap}pt) → 生成へ連携`,
    );
  }

  console.log("\n=== 4) 競合マネタイズ動線分析 (F-13) ===");
  const { result, competitorCount } = await runFunnelAnalysis({
    userId: user.id,
  });
  assert.ok(competitorCount >= 1, "競合が分析されていない");
  assert.ok(result.competitors.length >= 1, "競合の結果が空");
  for (const c of result.competitors) {
    assert.ok(c.monetizationType, "収益タイプが無い");
    assert.ok(c.confirmedFacts.length >= 1, "確認済み事実が無い");
    assert.ok(c.funnelSteps.length >= 3, "FUNNEL MAP が3段未満");
    assert.ok(
      c.funnelSteps.every(
        (s) => s.basis === "confirmed" || s.basis === "estimated",
      ),
      "確認済み/推定の区別が無い",
    );
  }
  assert.ok(result.adaptation.steps.length >= 3, "転用提案が無い");
  console.log(
    `  ✓ 競合${result.competitors.length}件: 収益タイプ・確認済み/推定の区別・FUNNEL MAP・転用提案`,
  );

  console.log("\n=== 5) 競合ゼロのユーザーは明示エラー ===");
  const temp = await prisma.user.create({
    data: { email: `temp-${Date.now()}@example.com`, passwordHash: "x" },
  });
  let funnelRejected = false;
  try {
    await runFunnelAnalysis({ userId: temp.id });
  } catch (e) {
    funnelRejected = e instanceof Error && e.message.includes("競合");
  }
  await prisma.user.delete({ where: { id: temp.id } });
  assert.ok(funnelRejected, "競合不足のエラーが出ていない");
  console.log("  ✓ 競合未登録時は案内付きエラー");

  console.log("\n=== 6) api_usage 記録 ===");
  const usage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "ai.funnels" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(usage, "ai.funnels の記録がない");
  console.log(`  ✓ ai.funnels $${Number(usage!.estimatedCostUsd).toFixed(4)}`);

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
