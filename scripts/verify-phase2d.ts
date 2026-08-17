import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  buildMonthGrid,
  getCalendarEntries,
  jstDateKey,
  jstRangeToUtc,
  reschedulePostDate,
} from "@/lib/calendar/service";
import { computeThemeAnalysis } from "@/lib/analytics/themes";

/** Phase 2 積み残し スライスD の受け入れ確認: コンテンツカレンダー (F-07) / テーマ別分析 (F-10) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });

  console.log("=== 1) 月グリッドの構築 (JST) ===");
  const weeks = buildMonthGrid(2026, 8);
  assert.ok(weeks.length >= 5, "週数が不足");
  assert.ok(
    weeks.every((w) => w.dateKeys.length === 7),
    "1週が7日でない",
  );
  assert.ok(weeks[0].dateKeys[0] <= "2026-08-01", "月初が含まれない");
  assert.ok(weeks[weeks.length - 1].dateKeys[6] >= "2026-08-31", "月末が含まれない");
  console.log(`  ✓ 2026年8月 = ${weeks.length}週 (日曜はじまり)`);

  console.log("\n=== 2) 予約のD&D移動 (時刻維持・過去は拒否) ===");
  // テスト用の予約を作る (JST 明日の 19:30)
  const draft = await prisma.generatedPost.create({
    data: {
      userId: user.id,
      draftsJson: [],
      selectedText: "カレンダー検証用の投稿",
      status: "draft",
    },
  });
  const account = await prisma.xAccount.findFirstOrThrow({
    where: { userId: user.id },
  });
  const tomorrow1930Utc = (() => {
    const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
    const d = new Date(
      Date.UTC(
        jstNow.getUTCFullYear(),
        jstNow.getUTCMonth(),
        jstNow.getUTCDate() + 1,
        19,
        30,
      ),
    );
    return new Date(d.getTime() - 9 * 3600 * 1000);
  })();
  const scheduled = await prisma.scheduledPost.create({
    data: {
      generatedPostId: draft.id,
      xAccountId: account.id,
      text: draft.selectedText!,
      scheduledAt: tomorrow1930Utc,
      status: "scheduled",
    },
  });

  // 2日後へ移動
  const dayAfterKey = (() => {
    const jst = new Date(Date.now() + 9 * 3600 * 1000 + 2 * 24 * 3600 * 1000);
    return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
  })();
  await reschedulePostDate({
    userId: user.id,
    scheduledPostId: scheduled.id,
    targetDateKey: dayAfterKey,
  });
  const moved = await prisma.scheduledPost.findUniqueOrThrow({
    where: { id: scheduled.id },
  });
  assert.strictEqual(jstDateKey(moved.scheduledAt), dayAfterKey, "日付が移動していない");
  const movedJst = new Date(moved.scheduledAt.getTime() + 9 * 3600 * 1000);
  assert.strictEqual(movedJst.getUTCHours(), 19, "時刻(時)が維持されていない");
  assert.strictEqual(movedJst.getUTCMinutes(), 30, "時刻(分)が維持されていない");
  console.log(`  ✓ ${dayAfterKey} へ移動、19:30 (JST) を維持`);

  let rejected = false;
  try {
    await reschedulePostDate({
      userId: user.id,
      scheduledPostId: scheduled.id,
      targetDateKey: "2020-01-01",
    });
  } catch (e) {
    rejected = e instanceof Error && e.message.includes("過去");
  }
  assert.ok(rejected, "過去への移動が拒否されていない");
  console.log("  ✓ 過去の日付への移動は拒否");

  console.log("\n=== 3) カレンダー項目の取得 ===");
  const { from, to } = jstRangeToUtc(
    weeks[0].dateKeys[0],
    weeks[weeks.length - 1].dateKeys[6],
  );
  const entries = await getCalendarEntries({ userId: user.id, from, to });
  assert.ok(Array.isArray(entries), "項目が取得できない");
  assert.ok(
    entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.dateKey)),
    "dateKey の形式が不正",
  );
  console.log(`  ✓ ${entries.length}件を日付キー付きで取得`);

  console.log("\n=== 4) テーマ別分析 (F-10 CONTENT ANALYSIS) ===");
  const aiUsageBefore = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "ai" },
  });
  const themes = await computeThemeAnalysis(user.id);
  assert.ok(themes.hasPillars, "ピラー設定が検出されていない");
  assert.ok(themes.sampleSize > 0, "サンプルが無い");
  assert.ok(themes.stats.length >= 1, "テーマ統計が空");
  const aiUsageAfter = await prisma.apiUsage.count({
    where: { userId: user.id, apiType: "ai" },
  });
  assert.strictEqual(aiUsageBefore, aiUsageAfter, "テーマ分析でAIコストが発生");
  console.log(
    `  ✓ ${themes.sampleSize}件を${themes.stats.length}テーマに分類 (AI呼び出し0)。トップ: ${themes.stats[0].theme}`,
  );

  // 後片付け
  await prisma.scheduledPost.delete({ where: { id: scheduled.id } });
  await prisma.generatedPost.delete({ where: { id: draft.id } });

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
