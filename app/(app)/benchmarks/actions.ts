"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { XApiService } from "@/lib/x-api";
import { BudgetExceededError } from "@/lib/usage/guard";

export type ActionState = { error: string | null; success: string | null };

const createListSchema = z.object({
  name: z.string().trim().min(1, "リスト名を入力してください").max(60),
  genreTag: z.string().trim().max(40).optional(),
  memo: z.string().trim().max(500).optional(),
});

export async function createListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = createListSchema.safeParse({
    name: formData.get("name"),
    genreTag: formData.get("genreTag") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください", success: null };
  }

  const count = await prisma.benchmarkList.count({ where: { userId } });

  await prisma.benchmarkList.create({
    data: {
      userId,
      name: parsed.data.name,
      genreTag: parsed.data.genreTag || null,
      memo: parsed.data.memo || null,
      sortOrder: count,
    },
  });

  revalidatePath("/benchmarks");
  return { error: null, success: `リスト「${parsed.data.name}」を作成しました` };
}

export async function deleteListAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const listId = String(formData.get("listId") ?? "");

  await prisma.benchmarkList.deleteMany({ where: { id: listId, userId } });
  revalidatePath("/benchmarks");
}

const addAccountSchema = z.object({
  listId: z.string().min(1),
  handle: z
    .string()
    .trim()
    .min(1, "@ID または プロフィールURL を入力してください")
    .max(120),
  genre: z.string().trim().max(40).optional(),
  memo: z.string().trim().max(500).optional(),
});

/** @ID / URL のどちらで入力されてもハンドル名だけを取り出す */
function normalizeHandle(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /(?:x\.com|twitter\.com)\/@?([A-Za-z0-9_]{1,15})/i,
  );
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, "");
}

export async function addAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = addAccountSchema.safeParse({
    listId: formData.get("listId"),
    handle: formData.get("handle"),
    genre: formData.get("genre") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください", success: null };
  }

  const list = await prisma.benchmarkList.findFirst({
    where: { id: parsed.data.listId, userId },
  });
  if (!list) {
    return { error: "リストが見つかりません", success: null };
  }

  const handle = normalizeHandle(parsed.data.handle);
  if (!handle) {
    return { error: "@ID を読み取れませんでした", success: null };
  }

  try {
    const xUser = await new XApiService(userId).getUserByHandle(handle);
    if (!xUser) {
      return { error: `@${handle} が見つかりませんでした`, success: null };
    }

    const existing = await prisma.benchmarkAccount.findUnique({
      where: { listId_xUserId: { listId: list.id, xUserId: xUser.xUserId } },
    });
    if (existing) {
      return { error: `@${handle} は既にこのリストに登録されています`, success: null };
    }

    await prisma.benchmarkAccount.create({
      data: {
        listId: list.id,
        xUserId: xUser.xUserId,
        handle: xUser.handle,
        displayName: xUser.displayName,
        profile: xUser.profile,
        profileImageUrl: xUser.profileImageUrl,
        url: xUser.url,
        followers: xUser.followers,
        following: xUser.following,
        postsCount: xUser.postsCount,
        genre: parsed.data.genre || list.genreTag,
        memo: parsed.data.memo || null,
      },
    });

    revalidatePath("/benchmarks");
    revalidatePath("/research");
    return { error: null, success: `@${xUser.handle} を追加しました` };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, success: null };
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "アカウントの取得に失敗しました",
      success: null,
    };
  }
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const accountId = String(formData.get("accountId") ?? "");

  await prisma.benchmarkAccount.deleteMany({
    where: { id: accountId, list: { userId } },
  });
  revalidatePath("/benchmarks");
  revalidatePath("/research");
}
