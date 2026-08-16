import { PostStatus, ScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { XApiService, isMockMode } from "@/lib/x-api";
import { getValidAccessToken } from "@/lib/x-oauth";
import { checkDuplicateAgainstOwnPosts } from "@/lib/generation/precheck";

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
  /** スレッド (ツリー) 投稿の2投稿目以降 (F-07 拡張。任意) */
  threadTexts?: string[];
  /** 1投稿目に添付する画像URL (F-07 拡張。任意・最大4枚) */
  mediaUrls?: string[];
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

  // 実質同一 (酷似) コンテンツもブロックする (§12 / F-07 投稿前チェック)
  const similarity = await checkDuplicateAgainstOwnPosts({
    userId: args.userId,
    text: generatedPost.selectedText,
  });
  if (similarity.isDuplicate) {
    throw new Error(
      `過去の投稿と実質同一の内容です (類似度 ${(similarity.maxScore * 100).toFixed(0)}%)。X の自動化ルールに抵触するため、内容を変えてから予約してください。`,
    );
  }

  const threadTexts = (args.threadTexts ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const mediaUrls = (args.mediaUrls ?? [])
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u));
  if (mediaUrls.length > 4) {
    throw new Error("画像は4枚までにしてください。");
  }

  const scheduled = await prisma.scheduledPost.create({
    data: {
      generatedPostId: generatedPost.id,
      xAccountId: xAccount.id,
      text: generatedPost.selectedText,
      threadTexts,
      mediaUrls,
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

      const xApi = new XApiService(userId);

      // 画像添付 (F-07 拡張): 1投稿目に添付する
      const mediaIds: string[] = [];
      for (const url of item.mediaUrls) {
        const { mediaId } = await xApi.uploadMediaFromUrl({ accessToken, url });
        mediaIds.push(mediaId);
      }

      const { xPostId } = await xApi.createPost({
        accessToken,
        text: item.text,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      });

      // スレッド投稿 (F-07 拡張): 直前の投稿への返信として順に投稿する。
      // 1投稿目が出た後の失敗で全体をリトライすると二重投稿になるため、
      // スレッドの失敗はリトライせず published のままエラーメモを残す
      let threadError: string | null = null;
      let replyTo = xPostId;
      for (let t = 0; t < item.threadTexts.length; t++) {
        try {
          const { xPostId: replyId } = await xApi.createPost({
            accessToken,
            text: item.threadTexts[t],
            replyToXPostId: replyTo,
          });
          replyTo = replyId;
        } catch (error) {
          threadError = `スレッド${t + 2}投稿目以降の投稿に失敗しました: ${
            error instanceof Error ? error.message : "不明なエラー"
          }`;
          break;
        }
      }

      const postedAt = new Date();

      await prisma.$transaction([
        prisma.scheduledPost.update({
          where: { id: item.id },
          data: {
            status: ScheduleStatus.published,
            postedXPostId: xPostId,
            postedAt,
            error: threadError,
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
