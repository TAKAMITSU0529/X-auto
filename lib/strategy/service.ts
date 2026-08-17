import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  AiService,
  type CustomerInsightResult,
  type PlaybookResult,
} from "@/lib/ai";

/**
 * マーケティング戦略AI (要件定義 F-09)。
 *
 * - WHO/WHAT/WHY/HOW はユーザー入力 (事実) として保存する
 * - CUSTOMER INSIGHT / MARKETING PLAYBOOK は AI生成であり、
 *   §9 に従い必ず「マーケティング仮説」として表示する
 * - 投稿生成 (F-05/F-06) はこの設定を常に参照する (lib/generation/service.ts)
 */

/** WHO (TARGET DESIGN) の入力項目 */
export type StrategyWho = {
  industry: string | null;
  ageRange: string | null;
  role: string | null;
  companySize: string | null;
  problems: string | null;
  desires: string | null;
  anxieties: string | null;
  buyingBarriers: string | null;
  alternatives: string | null;
  infoSources: string | null;
};

export type StrategyWhat = {
  value: string | null;
  products: string | null;
  usp: string | null;
};

export type StrategyWhy = {
  achievements: string | null;
  expertise: string | null;
  uniqueness: string | null;
};

export type StrategyHow = {
  tone: string | null;
  pillars: string | null;
  funnelIdea: string | null;
};

export type StrategyInput = {
  who: StrategyWho;
  what: StrategyWhat;
  why: StrategyWhy;
  how: StrategyHow;
};

/** CUSTOMER JOURNEY の段階 (F-09)。投稿ごとに「どの段階の人向けか」を設定する */
export const JOURNEY_STAGES = [
  "認知",
  "興味",
  "信頼",
  "比較",
  "相談",
  "購入",
] as const;

/** WHO/WHAT/WHY/HOW を保存する (upsert) */
export async function saveStrategy(
  userId: string,
  input: StrategyInput,
): Promise<void> {
  await prisma.marketingStrategy.upsert({
    where: { userId },
    create: {
      userId,
      whoJson: input.who as Prisma.InputJsonValue,
      whatJson: input.what as Prisma.InputJsonValue,
      whyJson: input.why as Prisma.InputJsonValue,
      howJson: input.how as Prisma.InputJsonValue,
    },
    update: {
      whoJson: input.who as Prisma.InputJsonValue,
      whatJson: input.what as Prisma.InputJsonValue,
      whyJson: input.why as Prisma.InputJsonValue,
      howJson: input.how as Prisma.InputJsonValue,
    },
  });
}

function hasContent(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  return Object.values(json as Record<string, unknown>).some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
}

/**
 * CUSTOMER INSIGHT を生成して保存する。
 * WHO が空のままだと仮説の土台がないため明示エラーにする。
 */
export async function runCustomerInsight(
  userId: string,
): Promise<CustomerInsightResult> {
  const strategy = await prisma.marketingStrategy.findUnique({
    where: { userId },
  });

  if (!strategy || !hasContent(strategy.whoJson)) {
    throw new Error(
      "先に WHO（誰に届けるか）を入力して保存してください。CUSTOMER INSIGHT はターゲット設定を土台に仮説化します。",
    );
  }

  const insight = await new AiService(userId).generateCustomerInsight({
    who: strategy.whoJson,
    what: strategy.whatJson,
    why: strategy.whyJson,
    how: strategy.howJson,
  });

  await prisma.marketingStrategy.update({
    where: { userId },
    data: { insightJson: insight as unknown as Prisma.InputJsonValue },
  });

  return insight;
}

/**
 * MARKETING PLAYBOOK を生成して保存する。
 * 設定 (WHO/WHAT どちらか) が無いと汎用論しか出ないため明示エラーにする。
 */
export async function runPlaybook(userId: string): Promise<PlaybookResult> {
  const strategy = await prisma.marketingStrategy.findUnique({
    where: { userId },
  });

  if (
    !strategy ||
    (!hasContent(strategy.whoJson) && !hasContent(strategy.whatJson))
  ) {
    throw new Error(
      "先に WHO / WHAT を入力して保存してください。PLAYBOOK は設定内容に合わせて作られます。",
    );
  }

  const brand = await prisma.brandProfile.findUnique({ where: { userId } });

  const playbook = await new AiService(userId).generatePlaybook({
    strategy: {
      who: strategy.whoJson,
      what: strategy.whatJson,
      why: strategy.whyJson,
      how: strategy.howJson,
    },
    insight: strategy.insightJson ?? undefined,
    brand: brand?.basicInfoJson ?? undefined,
  });

  await prisma.marketingStrategy.update({
    where: { userId },
    data: { playbookJson: playbook as unknown as Prisma.InputJsonValue },
  });

  return playbook;
}

/**
 * 投稿生成 (F-05/F-06) が参照するための要約済み戦略設定。
 * 設定が無い場合は undefined を返し、生成側は従来どおり動く。
 */
export async function getStrategyForGeneration(
  userId: string,
): Promise<unknown | undefined> {
  const strategy = await prisma.marketingStrategy.findUnique({
    where: { userId },
  });
  if (!strategy) return undefined;

  const payload = {
    who: strategy.whoJson,
    what: strategy.whatJson,
    why: strategy.whyJson,
    how: strategy.howJson,
    customerInsight: strategy.insightJson,
  };

  const hasAny =
    hasContent(strategy.whoJson) ||
    hasContent(strategy.whatJson) ||
    hasContent(strategy.whyJson) ||
    hasContent(strategy.howJson);

  return hasAny ? payload : undefined;
}
