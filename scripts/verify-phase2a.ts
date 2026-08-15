import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import { calculateImpactScore } from "@/lib/metrics/impact";
import { getRankedPosts } from "@/lib/research/service";
import { runBatchAnalysis } from "@/lib/research/batch";
import { generateThreeDrafts } from "@/lib/generation/service";

/** Phase 2 スライスA の受け入れ確認: IMPACT SCORE・一括分析・勝ちパターン・予測スコア */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });
  const account = await prisma.benchmarkAccount.findFirstOrThrow({
    where: { handle: "ai_keiei", list: { userId: user.id } },
  });

  console.log("=== 1) IMPACT SCORE (F-15) ===");
  // 強い投稿 vs 平凡な投稿でスコアが順序付くこと
  const strong = calculateImpactScore({
    metrics: { impressions: 50000, likes: 900, reposts: 150, quotes: 40, replies: 80, bookmarks: 400 },
    outlier: { score: 6, rate: 0.031, basis: "impressions", totalEngagements: 1570 },
    postedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
  });
  const weak = calculateImpactScore({
    metrics: { impressions: 5000, likes: 20, reposts: 2, quotes: 0, replies: 1, bookmarks: 3 },
    outlier: { score: 0.8, rate: 0.005, basis: "impressions", totalEngagements: 26 },
    postedAt: new Date(Date.now() - 80 * 24 * 3600 * 1000),
  });
  assert.ok(strong.score > weak.score, "強い投稿のスコアが高くない");
  assert.ok(strong.score <= 100 && weak.score >= 0, "0-100の範囲外");
  console.log(`  ✓ 強い投稿 ${strong.score}点 > 平凡な投稿 ${weak.score}点`);

  const ranking = await getRankedPosts({
    userId: user.id,
    benchmarkAccountId: account.id,
    sortBy: "impact",
    limit: 5,
  });
  assert.ok(ranking && ranking.posts.length > 0);
  const scores = ranking!.posts.map((p) => p.impactScore);
  assert.ok(
    scores.every((s, i) => i === 0 || scores[i - 1] >= s),
    "impact ソートが降順でない",
  );
  console.log(`  ✓ ランキング統合 OK (上位: ${scores.join(", ")})`);

  console.log("\n=== 2) 一括分析 → 勝ちパターン自動生成 (F-04/F-16) ===");
  const batch = await runBatchAnalysis({
    userId: user.id,
    benchmarkAccountId: account.id,
    topN: 20,
  });
  assert.ok(batch.result.winningPatterns.length >= 2, "勝ちパターンが2件未満");
  assert.ok(batch.result.summary.length > 0);
  assert.ok(batch.savedPatternIds.length >= 2, "パターンが保存されていない");
  console.log(
    `  ✓ ${batch.analyzedCount}件分析 → パターン${batch.savedPatternIds.length}件保存`,
  );
  for (const p of batch.result.winningPatterns) {
    console.log(`    - ${p.name}`);
  }

  // 再実行しても同名パターンは重複しない
  const again = await runBatchAnalysis({
    userId: user.id,
    benchmarkAccountId: account.id,
    topN: 20,
  });
  const total = await prisma.winningPattern.count({ where: { userId: user.id } });
  assert.strictEqual(
    total,
    batch.savedPatternIds.length,
    "同名パターンが重複保存されている",
  );
  console.log(`  ✓ 再実行でも重複なし (計${total}件) / 既存ID再利用: ${again.savedPatternIds.length}件`);

  console.log("\n=== 3) 勝ちパターンからの生成 + 予測スコア (F-06) ===");
  const gen = await generateThreeDrafts({
    userId: user.id,
    winningPatternId: batch.savedPatternIds[0],
    genre: "中小企業のAI活用",
    message: "AI導入は定着設計が9割",
  });
  assert.strictEqual(gen.drafts.length, 3);
  assert.ok(gen.predictedScores, "予測スコアが付いていない");
  assert.strictEqual(gen.predictedScores!.length, 3);
  for (const score of gen.predictedScores!) {
    assert.ok(score.total >= 0 && score.total <= 100);
    assert.ok(Object.keys(score.axes).length === 10, "評価軸が10軸でない");
  }
  console.log(
    `  ✓ パターン生成 + 予測スコア OK (${gen.predictedScores!.map((s) => s.total + "点").join(" / ")})`,
  );

  // DB にも保存されているか
  const saved = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: gen.generatedPostId },
  });
  assert.ok(saved.predictedScores, "predictedScores が保存されていない");
  const refs = saved.sourceRefs as { winningPatternId?: string };
  assert.strictEqual(refs.winningPatternId, batch.savedPatternIds[0]);
  console.log("  ✓ predictedScores / winningPatternId の保存 OK");

  console.log("\n=== 4) api_usage 記録 ===");
  for (const endpoint of ["ai.analyzeBatch", "ai.scoreDrafts"]) {
    const usage = await prisma.apiUsage.findFirst({
      where: { userId: user.id, endpoint },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(usage, `${endpoint} の記録がない`);
    console.log(
      `  ✓ ${endpoint} $${Number(usage!.estimatedCostUsd).toFixed(4)}`,
    );
  }

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
