import { prisma } from "@/lib/db";

/**
 * KNOWLEDGE BASE (要件定義 F-17)。
 *
 * 本人固有の一次情報 (考え方・経験・失敗談・事例・商品情報など) を蓄積し、
 * 投稿生成 (F-05/F-06) では競合投稿よりもこちらを優先して参照する。
 * 「他人の言葉ではなく本人の発信」にするための土台。
 */

export const KNOWLEDGE_KINDS = [
  "考え方",
  "経験",
  "失敗談",
  "成功事例",
  "顧客事例",
  "商品情報",
  "会社情報",
  "メモ",
] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

/** 生成プロンプトに入れる最大件数・1件あたりの最大文字数 */
const MAX_ITEMS_FOR_GENERATION = 5;
const MAX_CONTENT_CHARS = 400;

/**
 * 投稿生成が参照するナレッジを選ぶ。
 * ジャンル・伝えたい内容の語とタイトル/タグ/本文が重なるものを優先し、
 * 足りなければ新しいものから補う (全文をAIに渡すとコストが跳ねるため上限あり)。
 */
export async function getKnowledgeForGeneration(args: {
  userId: string;
  genre: string;
  message: string;
}): Promise<{ kind: string; title: string; content: string }[]> {
  const items = await prisma.knowledgeItem.findMany({
    where: { userId: args.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  if (items.length === 0) return [];

  // 日本語は分かち書きできないため、クエリの文字バイグラムが
  // タイトル/タグ/本文にどれだけ含まれるかで関連度を測る
  const query = `${args.genre} ${args.message}`;
  const queryBigrams = new Set<string>();
  const normalized = query.replace(/[\s、。・/｜|,.]+/g, "");
  for (let i = 0; i < normalized.length - 1; i++) {
    queryBigrams.add(normalized.slice(i, i + 2));
  }

  const scored = items.map((item) => {
    const haystack = `${item.title} ${item.tags.join(" ")} ${item.content}`;
    let matches = 0;
    for (const bigram of queryBigrams) {
      if (haystack.includes(bigram)) matches++;
    }
    return { item, matches };
  });

  scored.sort((a, b) => b.matches - a.matches);

  return scored
    .slice(0, MAX_ITEMS_FOR_GENERATION)
    .map(({ item }) => ({
      kind: item.kind,
      title: item.title,
      content:
        item.content.length > MAX_CONTENT_CHARS
          ? `${item.content.slice(0, MAX_CONTENT_CHARS)}…`
          : item.content,
    }));
}
