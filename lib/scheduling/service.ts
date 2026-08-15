import { PostStatus, ScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { XApiService, isMockMode } from "@/lib/x-api";
import { getValidAccessToken } from "@/lib/x-oauth";

/**
 * 予約投稿 (要件定義 F-07) の中核処理。
 *
 * - すべての投稿はユーザーが承認した下書き (selectedText) のみを対象とする
 * - 同一・実質同一コンテンツの再投稿はシステム側でブロックする (§7.4 / §12)
 * - 失敗時は指数バックオフで自動リトライし、エラーを記録する
 */

/** リトライ上限。超えたら failed として記録する */
export const MAX_RETRY = 3;

export async function schedulePost(args: {
  userId: string;
  generatedPostId: string;
  xAccountId: string;
  scheduledAt: Date;
}): Promise<{ scheduledPostId: string }> {
  const generatedPost = await prisma.generatedPost.findFirst({
    where: { id: args.generatedPostId, userId: args.userId },
  });
  if (!generatedPost) {
    throw new Error("下書きが見つかりません。");
  }
  if (!generatedPost.selectedText) {
    throw new Error("案が未選択です。生成スタジオで案を選んで保存してください。");
  }

  const xAccount = await prisma.xAccount.findFirst({
    where: { id: args.xAccountId, userId: args.userId },
  });
  if (!xAccount) {
    throw new Error("X アカウントが連携されていません。設定画面から連携してください。");
  }

  if (args.scheduledAt.getTime() < Date.now() - 60 * 1000) {
    throw new Error("予約日時が過去になっています。");
  }

  // 同一コンテンツの重複投稿ブロック (X 自動化ルール準拠)
  const duplicate = await prisma.scheduledPost.findFirst({
    where: {
      xAccountId: xAccount.id,
      text: generatedPost.selectedText,
      status: {
        in: [
          ScheduleStatus.scheduled,
          ScheduleStatus.posting,
          ScheduleStatus.published,
        ],
      },
    },
  });
  if (duplicate) {
    throw new Error(
      "同じ内容の投稿が既に予約済みまたは投稿済みです。X の自動化ルールにより同一コンテンツの再投稿はできません。",
    );
  }

  const scheduled = await prisma.scheduledPost.create({
    data: {
      generatedPostId: generatedPost.id,
      xAccountId: xAccount.id,
      text: generatedPost.selectedText,
      scheduledAt: args.scheduledAt,
      status: ScheduleStatus.scheduled,
    },
  });

  await prisma.generatedPost.update({
    where: { id: generatedPost.id },
    data: { status: PostStatus.scheduled },
  });

  return { scheduledPostId: scheduled.id };
}

export async function cancelScheduledPost(args: {
  userId: string;
  scheduledPostId: string;
}): Promise<void> {
  const scheduled = await prisma.scheduledPost.findFirst({
    where: {
      id: args.scheduledPostId,
      generatedPost: { userId: args.userId },
      status: ScheduleStatus.scheduled,
    },
  });
  if (!scheduled) {
    throw new Error("キャンセルできる予約が見つかりません。");
  }

  await prisma.scheduledPost.delete({ where: { id: scheduled.id } });
  await prisma.generatedPost.update({
    where: { id: scheduled.generatedPostId },
    data: { status: PostStatus.draft },
  });
}

export type ProcessResult = {
  processed: number;
  published: number;
  retried: number;
  failed: number;
};

/**
 * 期限が来た予約投稿を処理する。worker から定期的に呼ばれる。
 *
 * 失敗時は指数バックオフ (2分 → 4分 → 8分) で再スケジュールし、
 * MAX_RETRY を超えたら failed としてエラーを記録する (要件定義 F-07)。
 */
export async function processDueScheduledPosts(
  now = new Date(),
): Promise<ProcessResult> {
  const due = await prisma.scheduledPost.findMany({
    where: {
      status: ScheduleStatus.scheduled,
      scheduledAt: { lte: now },
    },
    include: {
      xAccount: true,
      generatedPost: { select: { userId: true, id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const result: ProcessResult = {
    processed: due.length,
    published: 0,
    retried: 0,
    failed: 0,
  };

  for (const item of due) {
    // 二重投稿防止: posting に遷移できた場合のみ処理する
    const claimed = await prisma.scheduledPost.updateMany({
      where: { id: item.id, status: ScheduleStatus.scheduled },
      data: { status: ScheduleStatus.posting },
    });
    if (claimed.count === 0) continue;

    const userId = item.generatedPost.userId;

    try {
      const accessToken = isMockMode()
        ? "mock-token"
        : await getValidAccessToken(item.xAccountId);

      const { xPostId } = await new XApiService(userId).createPost({
        accessToken,
        text: item.text,
      });

      const postedAt = new Date();

      await prisma.$transaction([
        prisma.scheduledPost.update({
          where: { id: item.id },
          data: {
            status: ScheduleStatus.published,
            postedXPostId: xPostId,
            postedAt,
            error: null,
          },
        }),
        prisma.generatedPost.update({
          where: { id: item.generatedPost.id },
          data: { status: PostStatus.published },
        }),
        // 自己投稿分析 (F-10) の対象として登録する
        prisma.ownPost.upsert({
          where: { xPostId },
          create: {
            xAccountId: item.xAccountId,
            xPostId,
            text: item.text,
            postedAt,
          },
          update: {},
        }),
      ]);

      result.published++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      const nextRetryCount = item.retryCount + 1;

      if (nextRetryCount <= MAX_RETRY) {
        // 指数バックオフで再スケジュール
        const delayMs = Math.pow(2, nextRetryCount) * 60 * 1000;
        await prisma.scheduledPost.update({
          where: { id: item.id },
          data: {
            status: ScheduleStatus.scheduled,
            retryCount: nextRetryCount,
            scheduledAt: new Date(Date.now() + delayMs),
            error: `リトライ ${nextRetryCount}/${MAX_RETRY}: ${message}`,
          },
        });
        result.retried++;
      } else {
        await prisma.scheduledPost.update({
          where: { id: item.id },
          data: {
            status: ScheduleStatus.failed,
            error: `リトライ上限到達: ${message}`,
          },
        });
        result.failed++;
      }
    }
  }

  return result;
}
