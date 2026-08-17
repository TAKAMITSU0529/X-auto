import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AiService, type ContentPlanResult } from "@/lib/ai";
import { computePerformanceInsights } from "@/lib/analytics/insights";
import { computePillarBalance, type Pillar } from "@/lib/pillars/service";
import { getStrategyForGeneration } from "@/lib/strategy/service";

/**
 * AUTO CONTENT PLAN (要件定義 F-23)。
 *
 * 「今月N投稿作る」と指示すると、AIが柱の比率 (F-18)・戦略 (F-09)・
 * 本人実績 (F-10) から月間投稿計画を設計し、カレンダー (F-07) に
 * 「アイデア」として配置する。
 *
 * 計画されるのはネタ (タイトル・切り口) であり、本文の生成・予約は
 * 必ずユーザーの操作と承認を経て行う (§12 完全自動投稿はしない)。
 */

export const MAX_PLAN_COUNT = 31;

export async function createContentPlan(args: {
  userId: string;
  count: number;
  /** 計画の開始日 (YYYY-MM-DD)。この日から約1ヶ月間に配置する */
  startDateKey: string;
}): Promise<{ result: ContentPlanResult; createdIdeaIds: string[] }> {
  if (args.count < 1 || args.count > MAX_PLAN_COUNT) {
    throw new Error(`投稿数は1〜${MAX_PLAN_COUNT}件で指定してください。`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDateKey)) {
    throw new Error("開始日の形式が不正です。");
  }

  const start = new Date(`${args.startDateKey}T00:00:00Z`);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 30);
  const endDateKey = end.toISOString().slice(0, 10);

  // 計画の材料 (すべてDB内データ)
  const [pillarSetting, pillarReport, strategy, insights, knowledgeTitles] =
    await Promise.all([
      prisma.contentPillarSetting.findUnique({ where: { userId: args.userId } }),
      computePillarBalance(args.userId),
      getStrategyForGeneration(args.userId),
      computePerformanceInsights(args.userId),
      prisma.knowledgeItem.findMany({
        where: { userId: args.userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { kind: true, title: true },
      }),
    ]);

  const pillars = pillarSetting
    ? (pillarSetting.pillarsJson as unknown as Pillar[]).map((p) => ({
        name: p.name,
        ratio: p.ratio,
      }))
    : [];

  const bestTime = insights.bySlot[0]
    ? insights.bySlot[0].label.split("-")[0] + ":00"
    : null;

  const result = await new AiService(args.userId).generateContentPlan({
    count: args.count,
    startDate: args.startDateKey,
    endDate: endDateKey,
    context: {
      pillars,
      pillarGaps: pillarReport?.balances ?? [],
      strategy,
      bestTime,
      bestHook: insights.best.hook,
      knowledge: knowledgeTitles,
    },
  });

  // 計画をアイデアとして保存する (カレンダーに表示され、生成へ連携できる)
  const createdIdeaIds: string[] = [];
  for (const item of result.items) {
    const created = await prisma.generatedPost.create({
      data: {
        userId: args.userId,
        status: "idea",
        draftsJson: [],
        sourceRefs: {
          kind: "content-plan",
          plannedFor: item.date,
          plannedTime: item.time,
          pillar: item.pillar,
          purpose: item.purpose,
          title: item.title,
          angle: item.angle,
        } as Prisma.InputJsonValue,
      },
    });
    createdIdeaIds.push(created.id);
  }

  return { result, createdIdeaIds };
}

export type PlannedIdea = {
  generatedPostId: string;
  dateKey: string;
  time: string;
  pillar: string;
  purpose: string;
  title: string;
  angle: string;
};

/** 期間内に計画されたアイデアを取得する (カレンダー表示用) */
export async function getPlannedIdeas(args: {
  userId: string;
  firstDateKey: string;
  lastDateKey: string;
}): Promise<PlannedIdea[]> {
  const ideas = await prisma.generatedPost.findMany({
    where: { userId: args.userId, status: "idea" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const results: PlannedIdea[] = [];
  for (const idea of ideas) {
    const refs = idea.sourceRefs as {
      kind?: string;
      plannedFor?: string;
      plannedTime?: string;
      pillar?: string;
      purpose?: string;
      title?: string;
      angle?: string;
    } | null;
    if (refs?.kind !== "content-plan" || !refs.plannedFor) continue;
    if (refs.plannedFor < args.firstDateKey || refs.plannedFor > args.lastDateKey)
      continue;

    results.push({
      generatedPostId: idea.id,
      dateKey: refs.plannedFor,
      time: refs.plannedTime ?? "",
      pillar: refs.pillar ?? "",
      purpose: refs.purpose ?? "",
      title: refs.title ?? "(無題)",
      angle: refs.angle ?? "",
    });
  }
  return results;
}

/** 計画アイデアを削除する */
export async function deletePlannedIdea(args: {
  userId: string;
  generatedPostId: string;
}): Promise<void> {
  await prisma.generatedPost.deleteMany({
    where: { id: args.generatedPostId, userId: args.userId, status: "idea" },
  });
}
