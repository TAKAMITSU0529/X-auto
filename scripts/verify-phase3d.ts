import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  runCustomerInsight,
  runPlaybook,
  saveStrategy,
  getStrategyForGeneration,
} from "@/lib/strategy/service";
import { getKnowledgeForGeneration } from "@/lib/knowledge/service";
import { generateThreeDrafts } from "@/lib/generation/service";

/** Phase 3 スライスD の受け入れ確認: マーケティング戦略AI (F-09) / KNOWLEDGE BASE (F-17) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) WHO/WHAT/WHY/HOW の保存 ===");
  await saveStrategy(user.id, {
    who: {
      industry: "従業員5〜50名の中小企業経営者",
      ageRange: "40〜60代",
      role: "代表取締役",
      companySize: "年商1〜10億円",
      problems: "人手不足。AI活用と言われても何から始めればいいか分からない",
      desires: "少ない人数でも回る会社にしたい",
      anxieties: "投資が無駄になること",
      buyingBarriers: "過去のツール導入失敗",
      alternatives: "ITに強い社員に任せている",
      infoSources: "X・経営者仲間の口コミ",
    },
    what: {
      value: "導入で終わらせず現場に定着するまで伴走する",
      products: "AI導入支援（3ヶ月）",
      usp: "「やめる業務を決める」から入る定着メソッド",
    },
    why: {
      achievements: "中小企業30社の導入支援。平均で月20時間削減",
      expertise: "製造業・士業向けの業務改善",
      uniqueness: "自社でも失敗経験がある",
    },
    how: {
      tone: "経営者目線・実例ベース・誇張しない",
      pillars: "導入事例／業務改善ノウハウ／経営の考え方",
      funnelIdea: "X → 無料資料 → メルマガ → 無料相談 → 支援契約",
    },
  });
  const saved = await prisma.marketingStrategy.findUniqueOrThrow({
    where: { userId: user.id },
  });
  assert.ok(saved.whoJson && saved.whatJson, "WHO/WHAT が保存されていない");
  console.log("  ✓ 戦略設定を保存 (upsert)");

  console.log("\n=== 2) CUSTOMER INSIGHT 生成・保存 ===");
  const insight = await runCustomerInsight(user.id);
  assert.ok(insight.surfaceProblem && insight.realProblem, "課題の仮説が無い");
  assert.ok(insight.whyNotBuy && insight.normToBreak, "本音項目が欠落");
  assert.ok(insight.emotions.length >= 1, "感情が無い");
  const withInsight = await prisma.marketingStrategy.findUniqueOrThrow({
    where: { userId: user.id },
  });
  assert.ok(withInsight.insightJson, "insight が保存されていない");
  console.log(`  ✓ 表面的課題→本当の課題→壊すべき常識まで9項目生成・保存`);

  console.log("\n=== 3) WHO未設定ユーザーは明示エラー ===");
  const temp = await prisma.user.create({
    data: { email: `temp-${Date.now()}@example.com`, passwordHash: "x" },
  });
  let rejected = false;
  try {
    await runCustomerInsight(temp.id);
  } catch (e) {
    rejected = e instanceof Error && e.message.includes("WHO");
  }
  assert.ok(rejected, "WHO未設定のエラーが出ていない");
  console.log("  ✓ WHO未設定時は案内付きエラー");

  console.log("\n=== 4) MARKETING PLAYBOOK 生成・保存 ===");
  const playbook = await runPlaybook(user.id);
  assert.ok(playbook.advices.length >= 3, "アドバイスが3件未満");
  assert.ok(
    playbook.advices.every((a) => a.area && a.advice && a.action),
    "アドバイスに欠落項目",
  );
  assert.ok(playbook.funnel.steps.length >= 4, "動線が4段未満");
  assert.ok(playbook.journey.length >= 6, "JOURNEY が6段階未満");
  console.log(
    `  ✓ アドバイス${playbook.advices.length}件 / 動線${playbook.funnel.steps.length}段 / JOURNEY ${playbook.journey.length}段階`,
  );

  console.log("\n=== 5) KNOWLEDGE BASE: 登録と生成時の選択 ===");
  await prisma.knowledgeItem.deleteMany({ where: { userId: user.id } });
  await prisma.knowledgeItem.create({
    data: {
      userId: user.id,
      kind: "顧客事例",
      title: "製造業A社で経理業務を月20時間削減した手順",
      content:
        "経理部だけで先行導入し、請求書処理をAI-OCR化。最初の1ヶ月は並行運用にして現場の不安を消した。結果、月20時間の削減。",
      tags: ["導入事例", "製造業"],
    },
  });
  await prisma.knowledgeItem.create({
    data: {
      userId: user.id,
      kind: "メモ",
      title: "関係ない読書メモ",
      content: "経営とは全く関係のない趣味の話。",
      tags: [],
    },
  });
  const selected = await getKnowledgeForGeneration({
    userId: user.id,
    genre: "中小企業のAI活用",
    message: "製造業の導入事例。経理から小さく始めて月20時間削減",
  });
  assert.ok(selected.length >= 1, "ナレッジが選ばれていない");
  assert.ok(
    selected[0].title.includes("製造業"),
    "関連ナレッジが優先されていない",
  );
  console.log(`  ✓ 関連ナレッジを優先選択 (1位: ${selected[0].title})`);

  console.log("\n=== 6) 生成が戦略・ナレッジ・JOURNEY段階を参照 ===");
  const strategyPayload = await getStrategyForGeneration(user.id);
  assert.ok(strategyPayload, "生成用の戦略ペイロードが空");
  const gen = await generateThreeDrafts({
    userId: user.id,
    genre: "中小企業のAI活用",
    message: "製造業の導入事例。経理から小さく始めるべき",
    journeyStage: "信頼",
  });
  assert.strictEqual(gen.drafts.length, 3, "3案生成されていない");
  const record = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: gen.generatedPostId },
  });
  const refs = record.sourceRefs as { journeyStage?: string };
  assert.strictEqual(refs.journeyStage, "信頼", "journeyStage が保存されていない");
  console.log("  ✓ 3案生成 + journeyStage を sourceRefs に保存");

  console.log("\n=== 7) api_usage 記録 ===");
  for (const endpoint of ["ai.customerInsight", "ai.playbook"]) {
    const usage = await prisma.apiUsage.findFirst({
      where: { userId: user.id, endpoint },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(usage, `${endpoint} の記録がない`);
    console.log(`  ✓ ${endpoint} $${Number(usage!.estimatedCostUsd).toFixed(4)}`);
  }

  await prisma.user.delete({ where: { id: temp.id } });
  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
