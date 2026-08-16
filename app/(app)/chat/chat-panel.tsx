"use client";

import { useRef, useState, useTransition } from "react";
import { chatTurnAction } from "./actions";
import type { ChatMessage, ChatReply } from "@/lib/ai/provider";

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
    <div className="mx-auto max-w-3xl space-y-4">
      {turns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-ink-700">
            X AUTO AI に何でも聞いてください
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            あなたの投稿実績・柱のズレ・ベンチマーク・戦略設定を文脈として回答します。回答は
            DATA（実測）と AI推定を区別して表示されます。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 transition hover:bg-ink-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
                  {turn.text}
                </p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[92%] space-y-2 rounded-2xl rounded-bl-sm border border-ink-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed text-ink-800">
                    {turn.text}
                  </p>

                  {turn.reply && turn.reply.dataPoints.length > 0 ? (
                    <div className="rounded-lg bg-ink-50 px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-bold tracking-wide text-ink-500">
                        DATA（実測）
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-ink-700">
                        {turn.reply.dataPoints.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {turn.reply && turn.reply.hypotheses.length > 0 ? (
                    <div className="rounded-lg bg-violet-50 px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-bold tracking-wide text-violet-600">
                        AI推定（仮説）
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-violet-900">
                        {turn.reply.hypotheses.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {turn.reply && turn.reply.nextActions.length > 0 ? (
                    <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-bold tracking-wide text-emerald-700">
                        NEXT ACTION
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-emerald-900">
                        {turn.reply.nextActions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ),
          )}
          {isPending ? (
            <p className="text-xs text-ink-400">回答を生成中...</p>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(inputRef.current?.value ?? "");
        }}
        className="flex items-end gap-2"
      >
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
          className="flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          送信
        </button>
      </form>
      <p className="text-xs text-ink-400">
        会話はこの画面を開いている間だけ保持されます。Ctrl/⌘ + Enter でも送信できます。
      </p>
    </div>
  );
}
