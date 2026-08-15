import { prisma } from "@/lib/db";
import { AiService, type CompetitorScore } from "@/lib/ai";
import { XApiService, type XUser } from "@/lib/x-api";

/**
 * 競合発見エンジン (要件定義 F-08)。
 *
 * v1 の探索手段はキーワード検索 (A. Keyword) のみ。
 * Follow Graph (フォロワーリスト取得) は API コスト・レート制限が重いため
 * 実装しない (要件定義の決定事項)。
 *
 * 発見した候補は AI が COMPETITOR SCORE (0〜100) で採点する。
 * 分析対象は公開プロフィールのみ。センシティブ属性の推定は行わない (§12)。
 */

export const DISCOVER_MAX_RESULTS = 10;

export type DiscoveredCompetitor = XUser & {
  score: number;
  genre: string;
  reasons: string[];
  /** 既にベンチマーク登録済みか */
  alreadyRegistered: boolean;
};

export async function discoverCompetitors(args: {
  userId: string;
  genre: string;
}): Promise<{ candidates: DiscoveredCompetitor[]; query: string }> {
  const query = args.genre;

  const users = await new XApiService(args.userId).searchUsers(
    query,
    DISCOVER_MAX_RESULTS,
  );

  if (users.length === 0) {
    throw new Error(
      "候補が見つかりませんでした。キーワードを変えて試してください。",
    );
  }

  const scores = await new AiService(args.userId).scoreCompetitors({
    genre: args.genre,
    candidates: users.map((u) => ({
      handle: u.handle,
      name: u.displayName,
      bio: u.profile ?? "",
      followers: u.followers,
    })),
  });
  const scoreByHandle = new Map<string, CompetitorScore>(
    scores.map((s) => [s.handle.replace(/^@/, ""), s]),
  );

  // 既存のベンチマーク登録と突合
  const registered = await prisma.benchmarkAccount.findMany({
    where: {
      list: { userId: args.userId },
      xUserId: { in: users.map((u) => u.xUserId) },
    },
    select: { xUserId: true },
  });
  const registeredIds = new Set(registered.map((r) => r.xUserId));

  const candidates: DiscoveredCompetitor[] = users
    .map((user) => {
      const score = scoreByHandle.get(user.handle);
      return {
        ...user,
        score: score?.score ?? 0,
        genre: score?.genre ?? args.genre,
        reasons: score?.reasons ?? [],
        alreadyRegistered: registeredIds.has(user.xUserId),
      };
    })
    .sort((a, b) => b.score - a.score);

  return { candidates, query };
}

/** 発見した競合をベンチマークリストへ追加する (無ければ専用リストを作る) */
export async function addCompetitorToBenchmark(args: {
  userId: string;
  genre: string;
  user: {
    xUserId: string;
    handle: string;
    displayName: string;
    profile: string | null;
    url: string | null;
    followers: number;
    following: number;
    postsCount: number;
  };
}): Promise<{ listName: string }> {
  const listName = `競合候補: ${args.genre}`.slice(0, 60);

  let list = await prisma.benchmarkList.findFirst({
    where: { userId: args.userId, name: listName },
  });
  if (!list) {
    const count = await prisma.benchmarkList.count({
      where: { userId: args.userId },
    });
    list = await prisma.benchmarkList.create({
      data: {
        userId: args.userId,
        name: listName,
        genreTag: args.genre,
        memo: "競合発見エンジン (F-08) から追加",
        sortOrder: count,
      },
    });
  }

  await prisma.benchmarkAccount.upsert({
    where: {
      listId_xUserId: { listId: list.id, xUserId: args.user.xUserId },
    },
    update: {},
    create: {
      listId: list.id,
      xUserId: args.user.xUserId,
      handle: args.user.handle,
      displayName: args.user.displayName,
      profile: args.user.profile,
      url: args.user.url,
      followers: args.user.followers,
      following: args.user.following,
      postsCount: args.user.postsCount,
      genre: args.genre,
    },
  });

  return { listName };
}
