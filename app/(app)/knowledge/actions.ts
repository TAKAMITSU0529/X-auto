"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { KNOWLEDGE_KINDS } from "@/lib/knowledge/service";

export type KnowledgeFormState = {
  error: string | null;
  success: string | null;
};

const createSchema = z.object({
  kind: z.enum(KNOWLEDGE_KINDS, "種類を選択してください"),
  title: z.string().trim().min(1, "タイトルを入力してください").max(120),
  content: z
    .string()
    .trim()
    .min(1, "内容を入力してください")
    .max(8000, "内容は8000文字までにしてください"),
  tags: z.string().trim().max(200).optional(),
});

export async function addKnowledgeAction(
  _prev: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  const userId = await requireUserId();

  const parsed = createSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    content: formData.get("content"),
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  const tags = (parsed.data.tags ?? "")
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 10);

  await prisma.knowledgeItem.create({
    data: {
      userId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      content: parsed.data.content,
      tags,
    },
  });

  revalidatePath("/knowledge");
  return { error: null, success: "ナレッジを追加しました" };
}

export async function deleteKnowledgeAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // 所有チェック付きで削除 (他ユーザーのIDを送られても消えない)
  await prisma.knowledgeItem.deleteMany({ where: { id, userId } });
  revalidatePath("/knowledge");
}
