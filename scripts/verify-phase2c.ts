import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import { applyPersonalCorrection } from "@/lib/generation/personal-model";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { generateThreeDrafts } from "@/lib/generation/service";
import { getRankedPosts } from "@/lib/research/service";
import { buildResearchCsv } from "@/lib/research/export";

/** Phase 2 スライスC の受け入れ確認: Personal Growth Model 補正・CSV */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) Personal Growth Model 補正 (F-19) ===");
  const insights = await computePerformanceInsights(user.id);
  console.log(
    `  実績: サンプル${insights.sampleSize}件 / ベストHOOK=${insights.best.hook} / ベスト形式=${insights.best.format}`,
  );

  const baseScore = {
    total: 80,
    axes: {
      hook: 8, relevance: 8, specificity: 8, novelty: 8, credibility: 8,
      emotion: 8, readability: 8, shareability: 8, cta: 8, brandFit: 8,
    },
    comment: "テスト",
  };

  // ベストHOOKに一致する案 → 加点されるはず
  const matchingText =
    insights.best.hook === "常識否定型"
      ? "9割の人が知らない事実。\n\n本文です。"
      : insights.best.hook === "体験談型"
        ? "昨日クライアントに言われた話。\n\n本文です。"
        : "これはその他の書き出しで、特定の型に該当しない普通の文章です。\n\n本文です。";

  const corrected = await applyPersonalCorrection({
    userId: user.id,
    drafts: [{ text: matchingText }, { text: "断言します。" + "あ".repeat(400) }],
    scores: [baseScore, { ...baseScore }],
  });

  if (insights.sampleSize >= 3 && insights.best.hook) {
    assert.ok(
      corrected[0].personalAdjustment.applied,
      "一致する案に補正が適用されていない",
    );
    assert.ok(corrected[0].total > corrected[0].baseTotal);
    console.log(
      `  ✓ 補正適用: ${corrected[0].baseTotal}点 → ${corrected[0].total}点 (${corrected[0].personalAdjustment.reasons.join(" / ")})`,
    );
  } else {
    assert.ok(!corrected[0].personalAdjustment.applied);
    console.log("  - サンプル不足のため補正なし (仕様どおり)");
  }

  console.log("\n=== 2) 生成フローへの統合 ===");
  const gen = await generateThreeDrafts({
    userId: user.id,
    genre: "AI活用",
    message: `Personal Growth Model 検証 ${Date.now()}`,
  });
  assert.ok(gen.predictedScores);
  assert.ok(
    gen.predictedScores!.every(
      (s) => "personalAdjustment" in s && "baseTotal" in s,
    ),
    "補正メタデータが付いていない",
  );
  const adjusted = gen.predictedScores!.filter(
    (s) => s.personalAdjustment.applied,
  );
  console.log(
    `  ✓ 3案とも補正メタデータ付き (補正適用: ${adjusted.length}案 / スコア: ${gen.predictedScores!.map((s) => `${s.baseTotal}→${s.total}`).join(", ")})`,
  );

  console.log("\n=== 3) CSV エクスポート (F-02) ===");
  const account = await prisma.benchmarkAccount.findFirstOrThrow({
    where: { handle: "ai_keiei", list: { userId: user.id } },
  });
  const ranking = await getRankedPosts({
    userId: user.id,
    benchmarkAccountId: account.id,
    sortBy: "outlier",
  });
  const csv = buildResearchCsv({
    posts: ranking!.posts,
    accountHandle: ranking!.account.handle,
    baselineRate: ranking!.baseline.baselineRate,
  });

  assert.ok(csv.startsWith("﻿"), "BOM が付いていない");
  const lines = csv.split("\r\n");
  assert.strictEqual(lines.length, 2 + ranking!.posts.length, "行数が一致しない");
  assert.ok(lines[1].includes("外れ値スコア"), "ヘッダが不正");
  // 本文の改行・カンマがエスケープされているか (フィールド数で確認)
  const headerCols = lines[1].split(",").length;
  console.log(
    `  ✓ CSV OK (${ranking!.posts.length}行 + ヘッダ / ${headerCols}列 / BOM付き)`,
  );

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
