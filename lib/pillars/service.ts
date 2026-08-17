import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * CONTENT PILLARS・投稿比率設計 (要件定義 F-18)。
 *
 * - 発信テーマをカテゴリー化し、目標比率を設計する
 * - 実際の投稿比率とのズレを計算して表示する
 *   (分類はキーワード一致のルールベース = §9 の DATA 扱い。追加AIコスト0)
 * - 不足している柱は生成スタジオへのワンクリック連携でネタ提案に反映する
 */

export type Pillar = {
  name: string;
  /** 目標比率 (%) */
  ratio: number;
  /** 分類に使うキーワード */
  keywords: string[];
};

/** 目的別分類 (Reach/Authority/Trust/Education/Conversion) の既定比率 */
export const PURPOSE_DEFS = [
  { key: "reach", label: "Reach（新規獲得）", defaultRatio: 30 },
  { key: "authority", label: "Authority（専門性）", defaultRatio: 25 },
  { key: "trust", label: "Trust（人間性・実績）", defaultRatio: 20 },
  { key: "education", label: "Education（教育）", defaultRatio: 15 },
  { key: "conversion", label: "Conversion（商品導線）", defaultRatio: 10 },
] as const;

export type PurposeRatios = Record<string, number>;

export const MAX_PILLARS = 6;

export async function savePillarSetting(args: {
  userId: string;
  pillars: Pillar[];
  purposeRatios: PurposeRatios;
}): Promise<void> {
  if (args.pillars.length === 0) {
    throw new Error("柱を1つ以上設定してください。");
  }
  if (args.pillars.length > MAX_PILLARS) {
    throw new Error(`柱は${MAX_PILLARS}個までにしてください。`);
  }

  const totalRatio = args.pillars.reduce((sum, p) => sum + p.ratio, 0);
  if (totalRatio > 100) {
    throw new Error(
      `柱の比率の合計が100%を超えています (現在 ${totalRatio}%)。`,
    );
  }

  await prisma.contentPillarSetting.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      pillarsJson: args.pillars as unknown as Prisma.InputJsonValue,
      purposeRatioJson: args.purposeRatios as Prisma.InputJsonValue,
    },
    update: {
      pillarsJson: args.pillars as unknown as Prisma.InputJsonValue,
      purposeRatioJson: args.purposeRatios as Prisma.InputJsonValue,
    },
  });
}

export type PillarBalance = {
  name: string;
  targetRatio: number;
  /** 実際の比率 (%. 分類できた投稿を母数にする) */
  actualRatio: number;
  /** target - actual。正の値 = 不足している */
  gap: number;
  postCount: number;
};

export type PillarBalanceReport = {
  /** 直近の分析対象になった自己投稿数 */
  totalPosts: number;
  /** どの柱にも分類できなかった投稿数 */
  unclassified: number;
  balances: PillarBalance[];
  /** 最も不足している柱 (ネタ提案に使う)。ズレなしなら null */
  mostLacking: PillarBalance | null;
};

/** 分析対象にする直近の自己投稿数 */
const RECENT_POSTS_LIMIT = 100;

/**
 * 投稿本文を柱に分類する。柱名とキーワードの一致数が最多の柱を返す。
 * 1件も一致しなければ null (未分類)。ルールベースなので DATA 扱い。
 */
export function classifyPost(text: string, pillars: Pillar[]): string | null {
  let best: { name: string; hits: number } | null = null;

  for (const pillar of pillars) {
    const needles = [pillar.name, ...pillar.keywords].filter(
      (n) => n.trim().length > 0,
    );
    const hits = needles.filter((n) => text.includes(n)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { name: pillar.name, hits };
    }
  }

  return best?.name ?? null;
}

/**
 * 設計した比率と実際の投稿比率のズレを計算する。
 * 設定が無い場合は null (画面側で設定を促す)。
 */
export async function computePillarBalance(
  userId: string,
): Promise<PillarBalanceReport | null> {
  const setting = await prisma.contentPillarSetting.findUnique({
    where: { userId },
  });
  if (!setting) return null;

  const pillars = setting.pillarsJson as unknown as Pillar[];

  const posts = await prisma.ownPost.findMany({
    where: { xAccount: { userId } },
    orderBy: { postedAt: "desc" },
    take: RECENT_POSTS_LIMIT,
    select: { text: true },
  });

  const counts = new Map<string, number>(pillars.map((p) => [p.name, 0]));
  let unclassified = 0;

  for (const post of posts) {
    const name = classifyPost(post.text, pillars);
    if (name === null) {
      unclassified++;
    } else {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const classifiedTotal = posts.length - unclassified;

  const balances: PillarBalance[] = pillars.map((pillar) => {
    const postCount = counts.get(pillar.name) ?? 0;
    const actualRatio =
      classifiedTotal > 0
        ? Math.round((postCount / classifiedTotal) * 100)
        : 0;
    return {
      name: pillar.name,
      targetRatio: pillar.ratio,
      actualRatio,
      gap: pillar.ratio - actualRatio,
      postCount,
    };
  });

  const lacking = [...balances]
    .filter((b) => b.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  return {
    totalPosts: posts.length,
    unclassified,
    balances,
    mostLacking: lacking[0] ?? null,
  };
}
