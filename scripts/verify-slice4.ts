import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  processDueScheduledPosts,
  schedulePost,
} from "@/lib/scheduling/service";
import { processMetricSnapshots } from "@/lib/analytics/service";
import { generateThreeDrafts, selectDraft } from "@/lib/generation/service";

/** スライス4の受け入れ確認: 予約投稿 → 投稿 → 自己投稿化 → スナップショット */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });
  const xAccount = await prisma.xAccount.findFirstOrThrow({
    where: { userId: user.id },
  });

  console.log("=== 0) 下書きを用意 (生成→選択) ===");
  const gen = await generateThreeDrafts({
    userId: user.id,
    genre: "AI活用",
    message: `予約投稿の検証テストです ${Date.now()}`,
  });
  await selectDraft({
    userId: user.id,
    generatedPostId: gen.generatedPostId,
    selectedIndex: 0,
    editedText: gen.drafts[0].text,
  });
  console.log("  ✓ 下書き作成 OK");

  console.log("\n=== 1) 予約 → 期限到来 → 投稿 (F-07) ===");
  const { scheduledPostId } = await schedulePost({
    userId: user.id,
    generatedPostId: gen.generatedPostId,
    xAccountId: xAccount.id,
    scheduledAt: new Date(Date.now() - 1000), // すでに期限が来ている
  });

  const result = await processDueScheduledPosts();
  console.log(
    `  処理: 対象${result.processed} 投稿${result.published} リトライ${result.retried} 失敗${result.failed}`,
  );

  const published = await prisma.scheduledPost.findUniqueOrThrow({
    where: { id: scheduledPostId },
  });
  assert.strictEqual(published.status, "published", "published になっていない");
  assert.ok(published.postedXPostId, "投稿IDが記録されていない");

  const genAfter = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: gen.generatedPostId },
  });
  assert.strictEqual(genAfter.status, "published");

  const ownPost = await prisma.ownPost.findUnique({
    where: { xPostId: published.postedXPostId! },
  });
  assert.ok(ownPost, "OwnPost が作成されていない (F-10 連携)");
  console.log("  ✓ 予約→投稿→自己投稿の登録 OK");

  console.log("\n=== 2) 同一コンテンツの再予約はブロック (X自動化ルール) ===");
  // 同じ selectedText の下書きをもう一度予約しようとする
  let blocked = false;
  try {
    await schedulePost({
      userId: user.id,
      generatedPostId: gen.generatedPostId,
      xAccountId: xAccount.id,
      scheduledAt: new Date(Date.now() + 60_000),
    });
  } catch (e) {
    blocked = e instanceof Error && e.message.includes("同じ内容");
  }
  assert.ok(blocked, "重複コンテンツをブロックできていない");
  console.log("  ✓ 重複ブロック OK");

  console.log("\n=== 3) メトリクススナップショット (F-10) ===");
  // 投稿直後は1hチェックポイント前なので取得されない
  const early = await processMetricSnapshots();
  const ownPostMetricsEarly = await prisma.ownPostMetric.count({
    where: { ownPostId: ownPost!.id },
  });
  assert.strictEqual(
    ownPostMetricsEarly,
    0,
    "投稿直後にスナップショットが取れてしまっている",
  );
  console.log(`  投稿直後: 記録0件 (1h前なので正しい) / 全体チェック${early.checked}件`);

  // 投稿時刻を2時間前にずらして 1h チェックポイントを発火させる
  await prisma.ownPost.update({
    where: { id: ownPost!.id },
    data: { postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  });
  const later = await processMetricSnapshots();
  const captured = await prisma.ownPostMetric.findMany({
    where: { ownPostId: ownPost!.id },
  });
  assert.ok(
    captured.some((m) => m.snapshotLabel === "1h"),
    "1h スナップショットが取得されていない",
  );
  const snap = captured.find((m) => m.snapshotLabel === "1h")!;
  console.log(
    `  ✓ 1h スナップショット取得 OK (インプ${snap.impressions} / URLクリック${snap.urlClicks} / プロフクリック${snap.profileClicks})`,
  );
  console.log(`    (今回の実行: 記録${later.captured}件)`);

  console.log("\n=== 4) api_usage への記録 ===");
  const postUsage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "posts.create" },
    orderBy: { createdAt: "desc" },
  });
  const readUsage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "posts.ownRead" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(postUsage, "posts.create の記録がない");
  assert.ok(readUsage, "posts.ownRead の記録がない");
  console.log(
    `  ✓ posts.create $${Number(postUsage!.estimatedCostUsd).toFixed(4)} / posts.ownRead $${Number(readUsage!.estimatedCostUsd).toFixed(4)}`,
  );

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
