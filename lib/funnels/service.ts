import { prisma } from "@/lib/db";
import { AiService, type FunnelAnalysisResult } from "@/lib/ai";

/**
 * 競合マネタイズ動線分析 (要件定義 F-13)。
 *
 * 登録済みベンチマークの公開情報 (プロフィール・プロフィールURL・
 * DB内の取得済み投稿のCTA) から収益導線を分析し、FUNNEL MAP と
 * 「自分が転用するならこの動線」を提案する。
 *
 * 制約 (§9):
 * - 収益額・成約率など非公開情報は推測しない
 * - 「確認済み」(公開情報から確認できた事実) と「推定」を必ず区別する
 * - 外部サイト (LP等) のクロールは行わない (要件定義 §13 残課題3)。
 *   材料はDB内の公開情報のみ = 追加のX APIコストゼロ
 */

export const MIN_COMPETITORS = 1;

/** 1回の分析に含める競合数の上限 (プロンプト肥大とコストを抑える) */
const MAX_COMPETITORS = 8;

/** 競合1人あたりの「誘導を含む投稿」の最大数 */
const MAX_CTA_POSTS = 3;

/** 投稿がリスト誘導・商品導線を含むかの判定 (ルールベース) */
const CTA_PATTERN =
  /https?:\/\/|プロフ(ィール)?|固定(ツイート|ポスト)?|LINE|メルマガ|公式|リンク|無料|配布|ダウンロード|DL|募集|予約|申し込み|お申込|セミナー|講座|相談/;

export async function runFunnelAnalysis(args: {
  userId: string;
}): Promise<{ result: FunnelAnalysisResult; competitorCount: number }> {
  const accounts = await prisma.benchmarkAccount.findMany({
    where: { list: { userId: args.userId } },
    orderBy: { followers: "desc" },
    take: MAX_COMPETITORS,
    include: {
      posts: {
        orderBy: { postedAt: "desc" },
        take: 50,
        select: { text: true },
      },
    },
  });

  if (accounts.length < MIN_COMPETITORS) {
    throw new Error(
      "動線分析には競合が1アカウント以上必要です。「競合発見」または「ベンチマーク」から登録してください。",
    );
  }

  const competitors = accounts.map((account) => ({
    handle: account.handle,
    name: account.displayName ?? account.handle,
    bio: account.profile ?? "",
    url: account.url,
    ctaPosts: account.posts
      .map((p) => p.text)
      .filter((text) => CTA_PATTERN.test(text))
      .slice(0, MAX_CTA_POSTS),
  }));

  const result = await new AiService(args.userId).analyzeFunnels({
    competitors,
  });

  return { result, competitorCount: accounts.length };
}
