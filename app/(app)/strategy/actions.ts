"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  runCustomerInsight,
  runPlaybook,
  saveStrategy,
} from "@/lib/strategy/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type StrategyFormState = {
  error: string | null;
  success: string | null;
};

const text = (max: number) => z.string().trim().max(max).optional();

const schema = z.object({
  // WHO (TARGET DESIGN)
  industry: text(200),
  ageRange: text(60),
  role: text(120),
  companySize: text(120),
  problems: text(1000),
  desires: text(1000),
  anxieties: text(1000),
  buyingBarriers: text(1000),
  alternatives: text(500),
  infoSources: text(500),
  // WHAT
  value: text(1000),
  products: text(1000),
  usp: text(1000),
  // WHY
  achievements: text(1000),
  expertise: text(1000),
  uniqueness: text(1000),
  // HOW
  tone: text(500),
  pillars: text(500),
  funnelIdea: text(1000),
});

export async function saveStrategyAction(
  _prev: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const userId = await requireUserId();

  const get = (name: string) => formData.get(name) || undefined;
  const parsed = schema.safeParse({
    industry: get("industry"),
    ageRange: get("ageRange"),
    role: get("role"),
    companySize: get("companySize"),
    problems: get("problems"),
    desires: get("desires"),
    anxieties: get("anxieties"),
    buyingBarriers: get("buyingBarriers"),
    alternatives: get("alternatives"),
    infoSources: get("infoSources"),
    value: get("value"),
    products: get("products"),
    usp: get("usp"),
    achievements: get("achievements"),
    expertise: get("expertise"),
    uniqueness: get("uniqueness"),
    tone: get("tone"),
    pillars: get("pillars"),
    funnelIdea: get("funnelIdea"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  const d = parsed.data;
  await saveStrategy(userId, {
    who: {
      industry: d.industry ?? null,
      ageRange: d.ageRange ?? null,
      role: d.role ?? null,
      companySize: d.companySize ?? null,
      problems: d.problems ?? null,
      desires: d.desires ?? null,
      anxieties: d.anxieties ?? null,
      buyingBarriers: d.buyingBarriers ?? null,
      alternatives: d.alternatives ?? null,
      infoSources: d.infoSources ?? null,
    },
    what: {
      value: d.value ?? null,
      products: d.products ?? null,
      usp: d.usp ?? null,
    },
    why: {
      achievements: d.achievements ?? null,
      expertise: d.expertise ?? null,
      uniqueness: d.uniqueness ?? null,
    },
    how: {
      tone: d.tone ?? null,
      pillars: d.pillars ?? null,
      funnelIdea: d.funnelIdea ?? null,
    },
  });

  revalidatePath("/strategy");
  return {
    error: null,
    success:
      "マーケティング戦略を保存しました。投稿生成はこの設定を常に参照します。",
  };
}

export type AiRunState = { error: string | null };

export async function generateInsightAction(
  _prev: AiRunState,
  _formData: FormData,
): Promise<AiRunState> {
  const userId = await requireUserId();
  try {
    await runCustomerInsight(userId);
  } catch (error) {
    if (error instanceof BudgetExceededError) return { error: error.message };
    return {
      error:
        error instanceof Error
          ? error.message
          : "CUSTOMER INSIGHT の生成に失敗しました",
    };
  }
  revalidatePath("/strategy");
  return { error: null };
}

export async function generatePlaybookAction(
  _prev: AiRunState,
  _formData: FormData,
): Promise<AiRunState> {
  const userId = await requireUserId();
  try {
    await runPlaybook(userId);
  } catch (error) {
    if (error instanceof BudgetExceededError) return { error: error.message };
    return {
      error:
        error instanceof Error ? error.message : "PLAYBOOK の生成に失敗しました",
    };
  }
  revalidatePath("/strategy");
  return { error: null };
}
