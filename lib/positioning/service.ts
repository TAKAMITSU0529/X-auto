import { prisma } from "@/lib/db";
import { AiService, type PositioningResult } from "@/lib/ai";

/**
 * ポジショニング分析 & プロフィール生成 (要件定義 F-12)。
 *
 * 登録済みのベンチマークアカウント (公開プロフィール) と MY BRAND を
 * 材料に、市場の2軸マップ・空きポジション・プロフィール3案を生成する。
 * 出力は全て AI推定 (マーケティング仮説) として表示する (§9)。
 */

export const MIN_COMPETITORS = 3;

export async function runPositioning(args: {
  userId: string;
  genre: string;
}): Promise<{ result: PositioningResult; competitorCount: number }> {
  // 材料はDB内の登録済みアカウントのみ = 追加のX APIコストゼロ
  const accounts = await prisma.benchmarkAccount.findMany({
    where: { list: { userId: args.userId } },
    orderBy: { followers: "desc" },
    take: 12,
  });

  if (accounts.length < MIN_COMPETITORS) {
    throw new Error(
      `ポジショニング分析には競合が${MIN_COMPETITORS}アカウント以上必要です (現在 ${accounts.length} 件)。「競合発見」または「ベンチマーク」から登録してください。`,
    );
  }

  const brand = await prisma.brandProfile.findUnique({
    where: { userId: args.userId },
  });

  const result = await new AiService(args.userId).analyzePositioning({
    genre: args.genre,
    brand: brand
      ? { basicInfo: brand.basicInfoJson, style: brand.styleJson }
      : undefined,
    competitors: accounts.map((a) => ({
      handle: a.handle,
      name: a.displayName ?? a.handle,
      bio: a.profile ?? "",
      followers: a.followers,
    })),
  });

  return { result, competitorCount: accounts.length };
}
