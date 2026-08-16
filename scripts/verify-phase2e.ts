import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  applyImprovedText,
  checkDuplicateAgainstOwnPosts,
  runPreCheck,
} from "@/lib/generation/precheck";
import {
  processDueScheduledPosts,
  schedulePost,
} from "@/lib/scheduling/service";

/** Phase 2 積み残し スライスE の受け入れ確認: 投稿前AIチェック・スレッド/画像予約 (F-07 拡張) */
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });
  const account = await prisma.xAccount.findFirstOrThrow({
    where: { userId: user.id },
  });

  console.log("=== 1) 投稿前AIチェック (8項目 + 重複) ===");
  const draft = await prisma.generatedPost.create({
    data: {
      userId: user.id,
      draftsJson: [],
      selectedText:
        "AIツールは導入より定着が大事です。先月支援した製造業のクライアントでは経理部だけで先行導入して月20時間削減できました。詳しくはプロフィールから。",
      status: "draft",
    },
  });
  const report = await runPreCheck({ userId: user.id, generatedPostId: draft.id });
  assert.strictEqual(report.aiCheck.items.length, 8, "チェックが8項目でない");
  assert.ok(
    report.aiCheck.items.every((i) => i.key && i.label && i.comment),
    "チェック項目に欠落",
  );
  assert.ok(
    ["ok", "caution"].includes(report.aiCheck.verdict),
    "verdict が不正",
  );
  assert.ok(report.aiCheck.improvedText.length > 0, "改善版が無い");
  assert.ok(report.duplicate.maxScore >= 0, "重複チェックが無い");
  console.log(
    `  ✓ 8項目 (${report.aiCheck.verdict}) + 重複チェック (最大類似 ${(report.duplicate.maxScore * 100).toFixed(0)}%) + 改善版`,
  );

  console.log("\n=== 2) 「AIでもっと強くする」で差し替え ===");
  await applyImprovedText({
    userId: user.id,
    generatedPostId: draft.id,
    improvedText: report.aiCheck.improvedText,
  });
  const updated = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: draft.id },
  });
  assert.strictEqual(updated.selectedText, report.aiCheck.improvedText, "差し替えられていない");
  assert.strictEqual(updated.status, "draft", "差し替え後も draft のまま予約可能であるべき");
  console.log("  ✓ 改善版に差し替え (status は draft を維持)");

  console.log("\n=== 3) 実質同一コンテンツの予約ブロック ===");
  const dupCheck = await checkDuplicateAgainstOwnPosts({
    userId: user.id,
    text: "全く新しいユニークな内容のテスト投稿です。責務分割の話。",
  });
  assert.ok(!dupCheck.isDuplicate, "無関係な文が重複扱いになっている");

  // 既存の自己投稿とほぼ同じ文を作って予約を試みる
  const existingOwn = await prisma.ownPost.findFirstOrThrow({
    where: { xAccount: { userId: user.id } },
  });
  const nearDup = await prisma.generatedPost.create({
    data: {
      userId: user.id,
      draftsJson: [],
      selectedText: existingOwn.text + "！",
      status: "draft",
    },
  });
  let blocked = false;
  try {
    await schedulePost({
      userId: user.id,
      generatedPostId: nearDup.id,
      xAccountId: account.id,
      scheduledAt: new Date(Date.now() + 3600 * 1000),
    });
  } catch (e) {
    blocked = e instanceof Error && e.message.includes("実質同一");
  }
  assert.ok(blocked, "実質同一の予約がブロックされていない");
  console.log("  ✓ 酷似コンテンツの予約は明示エラーでブロック");

  console.log("\n=== 4) スレッド + 画像付き予約 → 投稿処理 ===");
  const { scheduledPostId } = await schedulePost({
    userId: user.id,
    generatedPostId: draft.id,
    xAccountId: account.id,
    scheduledAt: new Date(Date.now() - 1000),
    threadTexts: ["スレッド2投稿目です。具体的な手順を説明します。", "スレッド3投稿目。まとめです。"],
    mediaUrls: ["https://example.com/image1.png"],
  });
  const scheduled = await prisma.scheduledPost.findUniqueOrThrow({
    where: { id: scheduledPostId },
  });
  assert.strictEqual(scheduled.threadTexts.length, 2, "スレッドが保存されていない");
  assert.strictEqual(scheduled.mediaUrls.length, 1, "画像URLが保存されていない");

  const result = await processDueScheduledPosts();
  const published = await prisma.scheduledPost.findUniqueOrThrow({
    where: { id: scheduledPostId },
  });
  assert.strictEqual(published.status, "published", "投稿されていない");
  assert.ok(published.postedXPostId, "投稿IDが無い");
  assert.strictEqual(published.error, null, "スレッド投稿でエラーが出ている");
  console.log(
    `  ✓ スレッド全3投稿 + 画像1枚を投稿 (published, 処理${result.processed}件)`,
  );

  console.log("\n=== 5) api_usage 記録 (ai.checkPost / media.upload) ===");
  for (const endpoint of ["ai.checkPost", "media.upload"]) {
    const usage = await prisma.apiUsage.findFirst({
      where: { userId: user.id, endpoint },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(usage, `${endpoint} の記録がない`);
    console.log(`  ✓ ${endpoint} $${Number(usage!.estimatedCostUsd).toFixed(4)}`);
  }

  // 後片付け (published の scheduled_post は残すと以後の重複判定に影響するため削除)
  await prisma.scheduledPost.delete({ where: { id: scheduledPostId } });
  await prisma.ownPost.deleteMany({
    where: { xPostId: published.postedXPostId! },
  });
  await prisma.generatedPost.delete({ where: { id: draft.id } });
  await prisma.generatedPost.delete({ where: { id: nearDup.id } });

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
