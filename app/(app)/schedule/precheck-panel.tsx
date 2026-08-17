"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  applyImprovedAction,
  preCheckAction,
  type ApplyImprovedState,
  type PreCheckState,
} from "./actions";
import { FormError, FormSuccess, Spinner } from "@/components/form";
import { MeterBar, Tag } from "@/components/ui";

const initialCheck: PreCheckState = { error: null, report: null };
const initialApply: ApplyImprovedState = { error: null, success: null };

/**
 * 投稿前AIチェック (F-07 拡張)。
 * 8項目のAI判定 (AI推定) + 過去投稿との重複チェック (DATA) を表示し、
 * 「このまま投稿」(そのまま予約フォームへ) か
 * 「AIでもっと強くする」(改善版への差し替え) を選べる。
 */
export function PreCheckPanel({ generatedPostId }: { generatedPostId: string }) {
  const [checkState, checkAction] = useActionState(preCheckAction, initialCheck);
  const [applyState, applyAction] = useActionState(
    applyImprovedAction,
    initialApply,
  );

  const report = checkState.report;
  const okCount = report
    ? report.aiCheck.items.filter((item) => item.ok).length
    : 0;

  return (
    <div className="mb-3">
      <form action={checkAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="generatedPostId" value={generatedPostId} />
        <CheckButton hasReport={Boolean(report)} />
        {!report ? (
          <span className="text-xs leading-relaxed text-ink-400">
            読みやすさ・HOOK・リスク表現など8項目＋過去投稿との重複を予約前に点検します
          </span>
        ) : null}
      </form>
      <div className="mt-2">
        <FormError message={checkState.error} />
      </div>

      {report ? (
        <div className="mt-3 space-y-4 rounded-card border border-ink-200 bg-ink-25 p-4">
          {/* 総合判定 (AI推定) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                report.aiCheck.verdict === "ok"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {report.aiCheck.verdict === "ok" ? "問題なし" : "注意あり"}
            </span>
            <Tag tone="hypothesis">AI推定</Tag>
            <span className="text-[13px] leading-relaxed text-ink-700">
              {report.aiCheck.summary}
            </span>
          </div>

          {/* AI推定の8項目 */}
          <section>
            <p className="mb-2 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              <Tag tone="hypothesis">AI推定</Tag>
              投稿前チェック
              <span className="ml-auto normal-case tracking-normal text-ink-600">
                <span className="tabular-nums">{okCount}</span>
                <span className="text-ink-400">
                  /<span className="tabular-nums">{report.aiCheck.items.length}</span>
                </span>{" "}
                項目OK
              </span>
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {report.aiCheck.items.map((item) => (
                <li key={item.key} className="flex gap-1.5 text-xs leading-snug">
                  <Verdict ok={item.ok} okLabel="OK" ngLabel="注意" />
                  <span>
                    <span className="font-semibold text-ink-800">
                      {item.label}
                    </span>
                    <span className="ml-1 text-ink-500">{item.comment}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 重複チェックは実測比較 (DATA) */}
          <section>
            <p className="mb-2 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              <Tag tone="data">DATA</Tag>
              類似投稿・重複（実測比較）
            </p>
            <div className="flex gap-1.5 text-xs leading-snug">
              <Verdict
                ok={!report.duplicate.isDuplicate}
                okLabel="OK"
                ngLabel="NG"
              />
              <div className="min-w-0 flex-1">
                <p className="text-ink-500">
                  <span className="font-semibold text-ink-800">
                    過去の投稿・予約との最大類似度{" "}
                    <span className="tabular-nums">
                      {(report.duplicate.maxScore * 100).toFixed(0)}%
                    </span>
                  </span>
                  {report.duplicate.similarTo
                    ? ` — 類似:「${report.duplicate.similarTo}…」`
                    : ""}
                  {report.duplicate.isDuplicate
                    ? "。実質同一のため予約はブロックされます"
                    : ""}
                </p>
                <MeterBar
                  ratio={report.duplicate.maxScore}
                  tone={report.duplicate.isDuplicate ? "amber" : "ink"}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* この先の2択 */}
          <div className="space-y-2 border-t border-ink-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              ここから2つの進み方があります
            </p>

            <div className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5">
              <p className="text-[13px] font-semibold text-ink-900">
                このまま投稿する
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                「このまま投稿」する場合は、そのまま下の予約フォームで日時を指定してください。
              </p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-2.5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-900">
                <Tag tone="hypothesis">AI推定</Tag>
                AIでもっと強くする（改善版のプレビュー）
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-violet-200/70 bg-white px-3 py-2 text-xs leading-relaxed text-ink-800">
                {report.aiCheck.improvedText}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-violet-700">
                変更点: {report.aiCheck.improvementNote}
              </p>
              <form action={applyAction} className="mt-2.5">
                <input
                  type="hidden"
                  name="generatedPostId"
                  value={generatedPostId}
                />
                <input
                  type="hidden"
                  name="improvedText"
                  value={report.aiCheck.improvedText}
                />
                <ApplyButton />
              </form>
            </div>
          </div>

          <FormError message={applyState.error} />
          <FormSuccess message={applyState.success} />
        </div>
      ) : null}
    </div>
  );
}

/** 合否バッジ。色だけでなく必ず文字 (OK / 注意 / NG) を伴わせる */
function Verdict({
  ok,
  okLabel,
  ngLabel,
}: {
  ok: boolean;
  okLabel: string;
  ngLabel: string;
}) {
  return (
    <span
      className={`inline-flex h-[18px] w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold ring-1 ring-inset ${
        ok
          ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
          : "bg-amber-100 text-amber-800 ring-amber-200"
      }`}
    >
      {ok ? okLabel : ngLabel}
    </span>
  );
}

function CheckButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-xs transition duration-200 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Spinner />
          チェック中...
        </>
      ) : hasReport ? (
        "投稿前AIチェックを再実行"
      ) : (
        "投稿前AIチェック"
      )}
    </button>
  );
}

function ApplyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition duration-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Spinner />
          差し替え中...
        </>
      ) : (
        "この改善版に差し替える"
      )}
    </button>
  );
}
