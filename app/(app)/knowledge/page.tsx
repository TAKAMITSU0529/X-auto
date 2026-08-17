import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { KNOWLEDGE_KINDS } from "@/lib/knowledge/service";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Tag,
  formatDateTime,
  formatNumber,
} from "@/components/ui";
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
        eyebrow="設定"
        title="KNOWLEDGE BASE"
        description="あなたの考え方・経験・失敗談・事例・商品情報を蓄積します。投稿生成は競合投稿よりもここを一次情報として優先し、「他人の言葉ではなく本人の発信」にします。"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader
            title="ナレッジを追加"
            description="1件ずつ登録します。数字と固有の状況が入っているほど生成の質が上がります。"
          />
          <KnowledgeForm kinds={KNOWLEDGE_KINDS} />
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip href="/knowledge" active={!activeKind}>
              すべて
              <span className="tabular-nums opacity-70">
                {formatNumber(total)}
              </span>
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
            activeKind ? (
              <EmptyState
                title={`「${activeKind}」のナレッジはまだありません`}
                description="この種類で登録するか、「すべて」に戻して他の種類を確認してください。"
              />
            ) : (
              <EmptyState
                title="ナレッジがまだありません"
                description="失敗談・顧客事例・自分の考え方など、投稿の材料になる一次情報を登録してください。数字と固有の状況が入っているほど生成の質が上がります。"
              />
            )
          ) : (
            <>
              <p className="text-xs text-ink-500">
                <span className="font-semibold tabular-nums text-ink-700">
                  {formatNumber(items.length)}
                </span>
                {" 件を表示中"}
                {activeKind ? `（種類：${activeKind}）` : ""}
                {" · 更新が新しい順"}
              </p>

              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag tone="brand">{item.kind}</Tag>
                          <span className="text-[13px] font-semibold text-ink-900">
                            {item.title}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
                          {item.content.length > 300
                            ? `${item.content.slice(0, 300)}…`
                            : item.content}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-2.5 text-xs text-ink-400">
                          <span className="tabular-nums">
                            {formatDateTime(item.updatedAt)}
                          </span>
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-ink-200 bg-ink-25 px-2 py-0.5 text-ink-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <form action={deleteKnowledgeAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-500 shadow-xs transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </Card>
                ))}
              </div>
            </>
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
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition duration-200 ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-xs"
          : "border-ink-200 bg-white text-ink-600 shadow-xs hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
      }`}
    >
      {children}
    </a>
  );
}
