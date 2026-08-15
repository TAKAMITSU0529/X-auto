import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  addCompetitorToBenchmark,
  discoverCompetitors,
} from "@/lib/competitors/service";

/** Phase 3 スライスB の受け入れ確認: 競合発見エンジン (F-08) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) 競合発見 + COMPETITOR SCORE ===");
  const { candidates } = await discoverCompetitors({
    userId: user.id,
    genre: "AI 業務改善",
  });

  assert.ok(candidates.length > 0, "候補が0件");
  assert.ok(
    candidates.every((c) => c.score >= 0 && c.score <= 100),
    "スコアが0-100の範囲外",
  );
  assert.ok(
    candidates.every((c, i) => i === 0 || candidates[i - 1].score >= c.score),
    "スコア降順になっていない",
  );
  assert.ok(
    candidates.every((c) => c.reasons.length > 0),
    "採点理由が無い候補がある",
  );
  console.log(`  ✓ ${candidates.length}件発見・スコア降順`);
  console.log(
    `    トップ: @${candidates[0].handle} (${candidates[0].score}点) — ${candidates[0].reasons[0]}`,
  );

  console.log("\n=== 2) ベンチマークへの追加 ===");
  const top = candidates[0];
  const { listName } = await addCompetitorToBenchmark({
    userId: user.id,
    genre: "AI 業務改善",
    user: top,
  });
  const added = await prisma.benchmarkAccount.findFirst({
    where: { xUserId: top.xUserId, list: { userId: user.id, name: listName } },
  });
  assert.ok(added, "ベンチマークに追加されていない");
  console.log(`  ✓ 「${listName}」に @${top.handle} を追加`);

  // 再探索すると alreadyRegistered が立つ
  const second = await discoverCompetitors({
    userId: user.id,
    genre: "AI 業務改善",
  });
  const flagged = second.candidates.find((c) => c.xUserId === top.xUserId);
  assert.ok(flagged?.alreadyRegistered, "登録済みフラグが立っていない");
  console.log("  ✓ 再探索時の登録済み判定 OK");

  console.log("\n=== 3) api_usage 記録 ===");
  for (const endpoint of ["user.search", "ai.scoreCompetitors"]) {
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
