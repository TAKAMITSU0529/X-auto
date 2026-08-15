import "dotenv/config";
import assert from "node:assert";
import { prisma } from "@/lib/db";
import {
  checkSimilarity,
  ngramJaccard,
} from "@/lib/text/similarity";
import { generateThreeDrafts, selectDraft } from "@/lib/generation/service";

/** スライス3の受け入れ確認: 類似度チェックと3案生成フロー */
async function main() {
  console.log("=== 1) 類似度チェック (F-05) ===");

  const source =
    "9割の人が知らないんですが、AIツールを導入しても成果が出ない会社には共通点があります。ツールを増やすことが目的になっていて、どの業務を削るのかが決まっていない。まず「やめる業務」を決めるのが先です。";

  // ほぼ丸写し → warning になるべき
  const copied =
    "9割の人が知らないですが、AIツールを導入しても成果が出ない会社には共通点があります。ツールを増やすことが目的になって、どの業務を削るかが決まっていない。まず「やめる業務」を決めるのが先。";
  const copiedResult = checkSimilarity(copied, source);
  console.log(
    `  丸写し: score=${copiedResult.score} level=${copiedResult.level}`,
  );
  assert.strictEqual(copiedResult.level, "warning", "丸写しを警告できていない");

  // 構造は同じだが内容が別 → ok になるべき
  const original =
    "意外と知られていませんが、営業研修を受けても数字が伸びない組織には共通点があります。学ぶことが目的になっていて、どの商談プロセスを変えるのかが決まっていない。まず「変える行動」を1つに絞るのが先です。";
  const originalResult = checkSimilarity(original, source);
  console.log(
    `  構造転用: score=${originalResult.score} level=${originalResult.level}`,
  );
  assert.notStrictEqual(
    originalResult.level,
    "warning",
    "構造転用まで警告してしまっている",
  );

  // 無関係な文章 → ほぼ0
  const unrelated = "今日は天気が良いので散歩に行きました。";
  assert.ok(ngramJaccard(unrelated, source) < 0.05);
  console.log("  ✓ 丸写し=warning / 構造転用=許容 / 無関係=ほぼ0");

  console.log("\n=== 2) 3案生成フロー (F-06) ===");
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@example.com" },
  });
  const sourcePost = await prisma.post.findFirstOrThrow({
    where: { benchmarkAccount: { list: { userId: user.id } } },
  });

  const result = await generateThreeDrafts({
    userId: user.id,
    sourcePostId: sourcePost.id,
    genre: "中小企業のAI活用",
    message: "AIツールは導入より定着が大事。まず1部署で小さく回すべき",
    experience: "先月支援したクライアントは経理部だけの先行導入で月20時間削減",
    purpose: "教育",
  });

  assert.strictEqual(result.drafts.length, 3, "3案生成されていない");
  const approaches = result.drafts.map((d) => d.approach).sort();
  assert.deepStrictEqual(
    approaches,
    ["authority", "empathy", "reach"],
    "3案のアプローチが揃っていない",
  );
  assert.ok(
    result.drafts.every((d) => d.similarity !== null),
    "類似度チェックが実行されていない",
  );
  console.log(`  ✓ 3案生成 OK (id=${result.generatedPostId})`);
  for (const d of result.drafts) {
    console.log(
      `    ${d.label}: ${d.text.slice(0, 30)}... [類似度 ${d.similarity?.score} ${d.similarity?.level}]`,
    );
  }

  console.log("\n=== 3) 案の選択・下書き保存 ===");
  await selectDraft({
    userId: user.id,
    generatedPostId: result.generatedPostId,
    selectedIndex: 1,
    editedText: result.drafts[1].text + "\n\n（編集済み）",
  });
  const saved = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: result.generatedPostId },
  });
  assert.strictEqual(saved.status, "draft");
  assert.strictEqual(saved.selectedIndex, 1);
  assert.ok(saved.selectedText?.includes("（編集済み）"));
  console.log("  ✓ 下書き保存 OK (status=draft)");

  console.log("\n=== 4) 元投稿に酷似した編集は保存を拒否 ===");
  let rejected = false;
  try {
    await selectDraft({
      userId: user.id,
      generatedPostId: result.generatedPostId,
      selectedIndex: 0,
      editedText: sourcePost.text, // 元投稿の丸写し
    });
  } catch {
    rejected = true;
  }
  assert.ok(rejected, "丸写しの保存を拒否できていない");
  console.log("  ✓ 丸写し保存の拒否 OK (受け入れ基準7)");

  console.log("\n=== 5) AI利用が api_usage に記録されている ===");
  const usage = await prisma.apiUsage.findFirst({
    where: { userId: user.id, endpoint: "ai.generateDrafts" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(usage, "api_usage に記録がない");
  console.log(
    `  ✓ ai.generateDrafts $${Number(usage!.estimatedCostUsd).toFixed(4)}`,
  );

  console.log("\nすべて OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
