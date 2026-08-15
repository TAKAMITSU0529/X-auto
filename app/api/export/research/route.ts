import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import {
  getRankedPosts,
  SORT_LABELS,
  type RankingSortKey,
} from "@/lib/research/service";
import { buildResearchCsv } from "@/lib/research/export";

/** リサーチ結果の CSV ダウンロード (F-02) */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account");
  const sortParam = url.searchParams.get("sort") ?? "outlier";

  if (!accountId) {
    return NextResponse.json({ error: "account は必須です" }, { status: 400 });
  }

  const sortBy: RankingSortKey =
    sortParam in SORT_LABELS ? (sortParam as RankingSortKey) : "outlier";

  const ranking = await getRankedPosts({
    userId,
    benchmarkAccountId: accountId,
    sortBy,
  });

  if (!ranking) {
    return NextResponse.json(
      { error: "アカウントが見つかりません" },
      { status: 404 },
    );
  }

  const csv = buildResearchCsv({
    posts: ranking.posts,
    accountHandle: ranking.account.handle,
    baselineRate: ranking.baseline.baselineRate,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="x-auto_${ranking.account.handle}_${date}.csv"`,
    },
  });
}
