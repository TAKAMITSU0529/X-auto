import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { MockXApiClient } from "../lib/x-api/mock";

/**
 * 開発用のシードデータ。
 *
 * X API の認証情報が無い状態でも「外れ値スコアが機能していること」が
 * 目で見て分かるように、モッククライアントで現実的な分布の投稿を投入する。
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password1234";

const SEED_LISTS = [
  {
    name: "AI経営者",
    genreTag: "AI活用",
    memo: "中小企業のAI導入について発信しているアカウント",
    handles: ["ai_keiei", "dx_partner", "genai_lab"],
  },
  {
    name: "業務改善・SaaS",
    genreTag: "業務改善",
    memo: "文体が参考になるアカウント",
    handles: ["kaizen_note", "saas_watch"],
  },
];

async function main() {
  console.log("シードデータを投入します...");

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "デモユーザー",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });
  console.log(`  ユーザー: ${user.email}`);

  await prisma.budgetSetting.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const mock = new MockXApiClient();
  const fetchedAt = new Date();

  for (const [index, listSeed] of SEED_LISTS.entries()) {
    const existing = await prisma.benchmarkList.findFirst({
      where: { userId: user.id, name: listSeed.name },
    });

    const list =
      existing ??
      (await prisma.benchmarkList.create({
        data: {
          userId: user.id,
          name: listSeed.name,
          genreTag: listSeed.genreTag,
          memo: listSeed.memo,
          sortOrder: index,
        },
      }));

    console.log(`  リスト: ${list.name}`);

    for (const handle of listSeed.handles) {
      const xUser = await mock.getUserByHandle(handle);
      if (!xUser) continue;

      const account = await prisma.benchmarkAccount.upsert({
        where: {
          listId_xUserId: { listId: list.id, xUserId: xUser.xUserId },
        },
        update: {},
        create: {
          listId: list.id,
          xUserId: xUser.xUserId,
          handle: xUser.handle,
          displayName: xUser.displayName,
          profile: xUser.profile,
          url: xUser.url,
          followers: xUser.followers,
          following: xUser.following,
          postsCount: xUser.postsCount,
          genre: listSeed.genreTag,
        },
      });

      // 1アカウント目だけ投稿も入れておき、ログイン直後に外れ値が見える状態にする
      if (handle !== listSeed.handles[0]) continue;

      const job = await prisma.researchJob.create({
        data: {
          userId: user.id,
          benchmarkAccountId: account.id,
          target: `@${account.handle}`,
          params: {
            maxResults: 100,
            excludeReplies: true,
            excludeReposts: true,
            sinceDays: null,
          },
          status: "completed",
          fetchedCount: 100,
          startedAt: fetchedAt,
          finishedAt: fetchedAt,
        },
      });

      const posts = await mock.getUserTimeline(account.xUserId, {
        maxResults: 100,
        excludeReplies: true,
        excludeReposts: true,
      });

      for (const post of posts) {
        const saved = await prisma.post.upsert({
          where: { xPostId: post.xPostId },
          update: { fetchedAt },
          create: {
            xPostId: post.xPostId,
            jobId: job.id,
            benchmarkAccountId: account.id,
            authorXUserId: post.authorXUserId,
            authorHandle: account.handle,
            text: post.text,
            lang: post.lang,
            hasMedia: post.hasMedia,
            mediaUrls: post.mediaUrls,
            isReply: post.isReply,
            isRepost: post.isRepost,
            isQuote: post.isQuote,
            permalink: post.permalink,
            postedAt: post.postedAt,
            fetchedAt,
          },
        });

        await prisma.postMetric.upsert({
          where: { postId_fetchedAt: { postId: saved.id, fetchedAt } },
          update: post.metrics,
          create: { postId: saved.id, fetchedAt, ...post.metrics },
        });
      }

      await prisma.benchmarkAccount.update({
        where: { id: account.id },
        data: { lastAnalyzedAt: fetchedAt },
      });

      console.log(`    @${account.handle}: 投稿 ${posts.length} 件`);
    }
  }

  console.log("\n完了しました。");
  console.log(`  ログイン: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
