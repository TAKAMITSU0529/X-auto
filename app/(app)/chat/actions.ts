"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { runChat } from "@/lib/chat/service";
import { BudgetExceededError } from "@/lib/usage/guard";
import type { ChatMessage, ChatReply } from "@/lib/ai";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4000),
});

const inputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "質問を入力してください")
    .max(1000, "質問は1000文字までにしてください"),
  history: z.array(messageSchema).max(20),
});

export type ChatTurnResult = {
  reply: ChatReply | null;
  error: string | null;
};

/** AI CHAT の1ターン (F-22)。履歴はクライアントが保持して渡す */
export async function chatTurnAction(
  question: string,
  history: ChatMessage[],
): Promise<ChatTurnResult> {
  const userId = await requireUserId();

  const parsed = inputSchema.safeParse({ question, history });
  if (!parsed.success) {
    return {
      reply: null,
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
    };
  }

  try {
    const reply = await runChat({
      userId,
      question: parsed.data.question,
      history: parsed.data.history,
    });
    return { reply, error: null };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { reply: null, error: error.message };
    }
    return {
      reply: null,
      error: error instanceof Error ? error.message : "回答の生成に失敗しました",
    };
  }
}
