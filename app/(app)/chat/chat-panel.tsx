"use client";

import { useRef, useState, useTransition } from "react";
import { chatTurnAction } from "./actions";
import type { ChatMessage, ChatReply } from "@/lib/ai/provider";
import { Card, CardHeader, EmptyState, Tag } from "@/components/ui";
import { FormError, Spinner, selectClassName } from "@/components/form";
import { IconArrowRight, IconSparkle } from "@/components/icons";

type Turn = {
  role: "user" | "assistant";
  text: string;
  reply?: ChatReply;
};

const SUGGESTIONS = [
  "最近何が伸びてる？",
  "自分は何について発信すべき？",
  "来週の投稿テーマを提案して",
  "自分の弱点は？",
];

/** AI CHAT (F-22)。履歴はクライアント側で保持する (このセッション内のみ) */
export function ChatPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || isPending) return;

    const history: ChatMessage[] = turns.map((t) => ({
      role: t.role,
      text: t.text,
    }));

    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";

    startTransition(async () => {
      const result = await chatTurnAction(q, history);
      if (result.error || !result.reply) {
        setError(result.error ?? "回答の生成に失敗しました");
        return;
      }
      const reply = result.reply;
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: reply.answer, reply },
      ]);
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        {turns.length === 0 ? (
          <EmptyState
            title="X AUTO AI に何でも聞いてください"
            description="あなたの投稿実績・柱のズレ・ベンチマーク・戦略設定を文脈として回答します。回答は DATA（実測）と AI推定を区別して表示されます。"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    disabled={isPending}
                    className="rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 shadow-xs transition duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          <div className="space-y-5">
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-xs">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex justify-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
                  >
                    <IconSparkle className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 max-w-[92%] space-y-2.5 rounded-2xl rounded-bl-sm border border-ink-200 bg-ink-25 px-4 py-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">
                      {turn.text}
                    </p>

                    {turn.reply && turn.reply.dataPoints.length > 0 ? (
                      <ReplyBlock
                        tone="data"
                        tag="DATA"
                        caption="実測"
                        items={turn.reply.dataPoints}
                      />
                    ) : null}

                    {turn.reply && turn.reply.hypotheses.length > 0 ? (
                      <ReplyBlock
                        tone="hypothesis"
                        tag="AI推定"
                        caption="仮説"
                        items={turn.reply.hypotheses}
                      />
                    ) : null}

                    {turn.reply && turn.reply.nextActions.length > 0 ? (
                      <ReplyBlock
                        tone="action"
                        tag="NEXT ACTION"
                        caption="次にやること"
                        items={turn.reply.nextActions}
                      />
                    ) : null}
                  </div>
                </div>
              ),
            )}

            {isPending ? (
              <p className="flex items-center gap-2 pl-10 text-xs text-ink-500">
                <Spinner />
                回答を生成中...
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-5 space-y-3 border-t border-ink-100 pt-5">
          <FormError message={error} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(inputRef.current?.value ?? "");
            }}
            className="flex items-end gap-2"
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">質問</span>
              <textarea
                ref={inputRef}
                rows={2}
                placeholder="例：この1ヶ月で何を変えるべき？"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    ask(inputRef.current?.value ?? "");
                  }
                }}
                className={`${selectClassName} resize-y leading-relaxed`}
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_6px_16px_-8px_rgba(43,79,230,0.7)] transition duration-200 hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Spinner /> : null}
              送信
            </button>
          </form>

          <p className="text-xs leading-relaxed text-ink-400">
            会話はこの画面を開いている間だけ保持されます。Ctrl/⌘ + Enter
            でも送信できます。
          </p>
        </div>
      </Card>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card>
          <CardHeader
            title="質問サジェスト"
            description="押すとそのまま質問できます。"
          />
          <ul className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => ask(s)}
                  disabled={isPending}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-ink-700 shadow-xs transition duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                  <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="回答の読み方"
            description="回答は3つの区分に分けて表示されます（要件定義 §9）。"
          />
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5">
              <Tag tone="data">DATA</Tag>
              <span className="text-xs leading-relaxed text-ink-600">
                蓄積データから確認できた実測値
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Tag tone="hypothesis">AI推定</Tag>
              <span className="text-xs leading-relaxed text-ink-600">
                実測から立てた仮説。事実ではありません
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Tag tone="action">ACTION</Tag>
              <span className="text-xs leading-relaxed text-ink-600">
                次にやること
              </span>
            </li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}

const REPLY_BLOCK_STYLES = {
  data: {
    box: "border-ink-200 bg-ink-50",
    caption: "text-ink-500",
    text: "text-ink-700",
    dot: "bg-ink-400",
  },
  hypothesis: {
    box: "border-violet-200/80 bg-violet-50/70",
    caption: "text-violet-600",
    text: "text-violet-900",
    dot: "bg-violet-400",
  },
  action: {
    box: "border-emerald-200 bg-emerald-50/70",
    caption: "text-emerald-700",
    text: "text-emerald-900",
    dot: "bg-emerald-500",
  },
} as const;

/**
 * 回答内の DATA / AI推定 / NEXT ACTION の区分 (要件定義 §9)。
 * ui.tsx の DataNote などは本文1つ用なので、箇条書き用にここで組む。
 * 色だけに頼らず必ずラベル文字を伴わせる。
 */
function ReplyBlock({
  tone,
  tag,
  caption,
  items,
}: {
  tone: keyof typeof REPLY_BLOCK_STYLES;
  tag: string;
  caption: string;
  items: string[];
}) {
  const s = REPLY_BLOCK_STYLES[tone];

  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${s.box}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <Tag tone={tone}>{tag}</Tag>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${s.caption}`}
        >
          {caption}
        </span>
      </div>
      <ul className={`space-y-1 text-[13px] leading-relaxed ${s.text}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              aria-hidden="true"
              className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${s.dot}`}
            />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
