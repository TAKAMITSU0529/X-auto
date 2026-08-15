"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { isMockMode } from "@/lib/x-api";

/**
 * モックモード用の X 連携 (F-01)。
 *
 * mock モードでは実際の OAuth フローを実行できないため、
 * ダミーの連携アカウントを作成して以降の開発 (予約投稿・自己分析) を
 * 進められるようにする。real モードでは /api/x/connect が本物のフローを行う。
 */
export async function connectMockXAccountAction(): Promise<void> {
  const userId = await requireUserId();

  if (!isMockMode()) {
    throw new Error("実データモードではモック連携は使えません。");
  }

  await prisma.xAccount.upsert({
    where: { userId_xUserId: { userId, xUserId: `mock-self-${userId}` } },
    create: {
      userId,
      xUserId: `mock-self-${userId}`,
      handle: "my_mock_account",
      displayName: "自分のアカウント（モック）",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      lastSyncedAt: new Date(),
    },
    update: { lastSyncedAt: new Date() },
  });

  revalidatePath("/settings");
}

/** X 連携の解除 */
export async function disconnectXAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const accountId = String(formData.get("accountId") ?? "");

  await prisma.xAccount.deleteMany({ where: { id: accountId, userId } });
  revalidatePath("/settings");
}
