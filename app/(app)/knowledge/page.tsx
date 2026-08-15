import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { KNOWLEDGE_KINDS } from "@/lib/knowledge/service";
import { Card, EmptyState, PageHeader, formatDateTime } from "@/components/ui";
import { KnowledgeForm } from "./knowledge-form";
import { deleteKnowledgeAction } from "./actions";

/**
 * KNOWLEDGE BASE (F-17)。
 * 本人固有の一次情報を蓄積する。投稿生成 (F-05/F-06) は競合投稿よりも
 * ここに登録した内容を優先して参照する。
 */
export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const userId = await requireUserId();
  const { kind } = await searchParams;

  const activeKind = KNOWLEDGE_KINDS.includes(
    kind as (typeof KNOWLEDGE_KINDS)[number],
  )
    ? kind
    : undefined;

  const [items, total] = await Promise.all([
    prisma.knowledgeItem.findMany({
      where: { userId, ...(activeKind ? { kind: activeKind } : {}) },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeItem.count({ where: { userId } }),
  ]);

  return (
    <>
      <PageHeader
        title="KNOWLEDGE BASE"
        description="あなたの考え方・経験・失敗談・事例・商品情報を蓄積します。投稿生成は競合投稿よりもここを一次情報として優先し、「他人の言葉ではなく本人の発信」にします。"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="h-fit">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">
            ナレッジを追加
          </h2>
          <KnowledgeForm kinds={KNOWLEDGE_KINDS} />
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip href="/knowledge" active={!activeKind}>
              すべて ({total})
            </FilterChip>
            {KNOWLEDGE_KINDS.map((k) => (
              <FilterChip
                key={k}
                href={`/knowledge?kind=${encodeURIComponent(k)}`}
                active={activeKind === k}
              >
                {k}
              </FilterChip>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="ナレッジがまだありません"
              description="失敗談・顧客事例・自分の考え方など、投稿の材料になる一次情報を登録してください。数字と固有の状況が入っているほど生成の質が上がります。"
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                          {item.kind}
                        </span>
                        <span className="font-medium text-ink-900">
                          {item.title}
                        </span>
                      </p>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-ink-700">
                        {item.content.length > 300
                          ? `${item.content.slice(0, 300)}…`
                          : item.content}
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                        <span>{formatDateTime(item.updatedAt)}</span>
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-ink-200 px-2 py-0.5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </p>
                    </div>
                    <form action={deleteKnowledgeAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="shrink-0 rounded-md border border-ink-200 px-2.5 py-1 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
      }`}
    >
      {children}
    </a>
  );
}
