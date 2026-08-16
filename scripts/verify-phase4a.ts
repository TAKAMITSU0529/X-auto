import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import { buildChatContext, runChat } from "@/lib/chat/service";
import {
  createContentPlan,
  deletePlannedIdea,
  getPlannedIdeas,
} from "@/lib/plan/service";

/** Phase 4 スライスA の受け入れ確認: AI CHAT (F-22) / AUTO CONTENT PLAN (F-23) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) チャットコンテキストの組み立て (DB内データのみ) ===");
  const xUsageBefore = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "x" },
  });
  const context = await buildChatContext(user.id);
  assert.ok(context.ownPostCount >= 0, "実績が組み込まれていない");
  assert.ok(Array.isArray(context.pillars), "柱の情報が無い");
  assert.ok(Array.isArray(context.topBenchmarkPosts), "ベンチマーク情報が無い");
  assert.ok(context.budget.limitUsd > 0, "予算情報が無い");
  const xUsageAfter = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "x" },
  });
  assert.strictEqual(xUsageBefore, xUsageAfter, "コンテキスト組み立てでX APIを呼んでいる");
  console.log(
    `  ✓ 実績${context.ownPostCount}件・柱${context.pillars.length}本・ベンチ${context.topBenchmarkPosts.length}件 (X APIコスト0)`,
  );

  console.log("\n=== 2) AI CHAT: DATA/仮説/ACTION の区別付き回答 ===");
  const reply = await runChat({
    userId: user.id,
    question: "最近何が伸びてる？次に何をすべき？",
    history: [],
  });
  assert.ok(reply.answer.length > 0, "回答が空");
  assert.ok(reply.dataPoints.length >= 1, "DATA が無い");
  assert.ok(reply.hypotheses.length >= 1, "仮説が無い");
  assert.ok(reply.nextActions.length >= 1, "ACTION が無い");
  console.log(
    `  ✓ 回答 + DATA ${reply.dataPoints.length}件 / 仮説 ${reply.hypotheses.length}件 / ACTION ${reply.nextActions.length}件`,
  );

  console.log("\n=== 3) 履歴付きの継続会話 ===");
  const reply2 = await runChat({
    userId: user.id,
    question: "それを踏まえて明日の投稿は？",
    history: [
      { role: "user", text: "最近何が伸びてる？" },
      { role: "assistant", text: reply.answer },
    ],
  });
  assert.ok(reply2.answer.length > 0, "継続会話の回答が空");
  console.log("  ✓ 履歴を渡した継続ターンも回答");

  console.log("\n=== 4) AUTO CONTENT PLAN: 生成とカレンダー配置 ===");
  const startDateKey = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);
  const { result, createdIdeaIds } = await createContentPlan({
    userId: user.id,
    count: 6,
    startDateKey,
  });
  assert.strictEqual(result.items.length, 6, "計画が6件でない");
  assert.ok(
    result.items.every((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date)),
    "日付形式が不正",
  );
  assert.ok(
    result.items.every((i) => i.title && i.angle && i.pillar && i.purpose),
    "計画項目に欠落",
  );
  assert.strictEqual(createdIdeaIds.length, 6, "アイデアが保存されていない");

  const ideas = await getPlannedIdeas({
    userId: user.id,
    firstDateKey: startDateKey,
    lastDateKey: "2099-12-31",
  });
  assert.ok(ideas.length >= 6, "カレンダー用アイデアが取得できない");
  console.log(
    `  ✓ ${result.items.length}件を設計し idea として保存 (例: ${result.items[0].date} ${result.items[0].time} / ${result.items[0].pillar})`,
  );

  console.log("\n=== 5) 件数バリデーションとアイデア削除 ===");
  let rejected = false;
  try {
    await createContentPlan({ userId: user.id, count: 99, startDateKey });
  } catch (e) {
    rejected = e instanceof Error && e.message.includes("31");
  }
  assert.ok(rejected, "件数超過が拒否されていない");
  for (const id of createdIdeaIds) {
    await deletePlannedIdea({ userId: user.id, generatedPostId: id });
  }
  const remaining = await prisma.generatedPost.count({
    where: { id: { in: createdIdeaIds } },
  });
  assert.strictEqual(remaining, 0, "アイデアが削除できていない");
  console.log("  ✓ 32件以上は拒否・アイデア削除OK");

  console.log("\n=== 6) api_usage 記録 (ai.chat / ai.contentPlan) ===");
  for (const endpoint of ["ai.chat", "ai.contentPlan"]) {
    const usage = await prisma.apiUsage.findFirst({
      where: { userId: user.id, endpoint },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(usage, `${endpoint} の記録がない`);
    console.log(`  ✓ ${endpoint} $${Number(usage!.estimatedCostUsd).toFixed(4)}`);
  }

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
