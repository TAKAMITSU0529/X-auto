import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  classifyFormat,
  classifyHook,
  computePerformanceInsights,
} from "@/lib/analytics/insights";
import {
  generateAndStoreWeeklyReport,
  getLatestWeeklyReport,
} from "@/lib/analytics/weekly-report";

/** Phase 2 スライスB の受け入れ確認: HOOK/形式/時間帯分析・週次レポート */
async function main() {
  console.log("=== 1) HOOK / 形式の機械分類 ===");
  assert.strictEqual(classifyHook("失敗しました。\n\n本文"), "失敗談型");
  assert.strictEqual(classifyHook("9割の人が知らないんですが、"), "常識否定型");
  assert.strictEqual(classifyHook("なぜ伸びないか知っていますか？"), "質問型");
  assert.strictEqual(classifyHook("3年間で100社を支援してわかったこと"), "数字型");
  assert.strictEqual(classifyHook("昨日クライアントに言われた一言。"), "体験談型");
  assert.strictEqual(classifyFormat("短い投稿です"), "短文");
  assert.strictEqual(classifyFormat("・項目1\n・項目2\n・項目3"), "箇条書き");
  assert.strictEqual(classifyFormat("あ".repeat(350)), "長文");
  console.log("  ✓ 分類ルール OK");

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("\n=== 2) パフォーマンス分析 (F-10拡張 / F-19初版) ===");
  const insights = await computePerformanceInsights(user.id);
  assert.ok(insights.sampleSize > 0, "サンプルが0件");
  assert.ok(insights.byHook.length > 0, "HOOK別集計が空");
  assert.ok(insights.heatmap.length > 0, "ヒートマップが空");
  assert.ok(insights.insights.length > 0, "インサイト文が空");
  console.log(`  ✓ サンプル${insights.sampleSize}件 / HOOK ${insights.byHook.length}種 / ヒートマップ${insights.heatmap.length}セル`);
  for (const text of insights.insights.slice(0, 2)) {
    console.log(`    - ${text}`);
  }

  console.log("\n=== 3) 週次AIレポート + NEXT BEST ACTION (F-20) ===");
  const stored = await generateAndStoreWeeklyReport(user.id);
  assert.ok(stored.report.summary.length > 0);
  assert.ok(stored.report.nextActions.length >= 2, "NEXT BEST ACTION が2件未満");
  console.log(`  ✓ 生成 OK: ${stored.report.summary.slice(0, 60)}...`);
  console.log(`  ✓ NEXT BEST ACTION ${stored.report.nextActions.length}件`);

  // 同日再生成は上書き (重複しない)
  await generateAndStoreWeeklyReport(user.id);
  const count = await prisma.weeklyReport.count({ where: { userId: user.id } });
  assert.strictEqual(count, 1, "同日の再生成が重複保存されている");
  console.log("  ✓ 同日再生成の上書き OK");

  const latest = await getLatestWeeklyReport(user.id);
  assert.ok(latest, "最新レポートが取得できない");
  assert.ok(latest!.report.nextActions.length > 0);
  console.log("  ✓ 保存済みレポートの読み出し OK");

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
