"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  applyImprovedAction,
  preCheckAction,
  type ApplyImprovedState,
  type PreCheckState,
} from "./actions";
import { FormError, FormSuccess } from "@/components/form";

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

  return (
    <div className="mb-3">
      <form action={checkAction} className="flex items-center gap-2">
        <input type="hidden" name="generatedPostId" value={generatedPostId} />
        <CheckButton hasReport={Boolean(report)} />
        {!report ? (
          <span className="text-xs text-ink-400">
            読みやすさ・HOOK・リスク表現など8項目＋過去投稿との重複を予約前に点検します
          </span>
        ) : null}
      </form>
      <FormError message={checkState.error} />

      {report ? (
        <div className="mt-2 space-y-2 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
          <p className="text-xs">
            <span
              className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                report.aiCheck.verdict === "ok"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {report.aiCheck.verdict === "ok" ? "問題なし" : "注意あり"}
            </span>
            <span className="text-ink-700">{report.aiCheck.summary}</span>
            <span className="ml-1 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-bold text-violet-700">
              AI推定
            </span>
          </p>

          <div className="grid gap-1 sm:grid-cols-2">
            {report.aiCheck.items.map((item) => (
              <p key={item.key} className="text-xs leading-snug">
                <span
                  className={`mr-1 inline-block w-9 rounded px-1 py-0.5 text-center text-[10px] font-bold ${
                    item.ok
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.ok ? "OK" : "注意"}
                </span>
                <span className="font-medium text-ink-800">{item.label}</span>
                <span className="ml-1 text-ink-500">{item.comment}</span>
              </p>
            ))}
            <p className="text-xs leading-snug">
              <span
                className={`mr-1 inline-block w-9 rounded px-1 py-0.5 text-center text-[10px] font-bold ${
                  report.duplicate.isDuplicate
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {report.duplicate.isDuplicate ? "NG" : "OK"}
              </span>
              <span className="font-medium text-ink-800">類似投稿・重複</span>
              <span className="ml-1 text-ink-500">
                過去の投稿・予約との最大類似度{" "}
                {(report.duplicate.maxScore * 100).toFixed(0)}%（実測比較）
                {report.duplicate.similarTo
                  ? ` — 類似:「${report.duplicate.similarTo}…」`
                  : ""}
                {report.duplicate.isDuplicate
                  ? "。実質同一のため予約はブロックされます"
                  : ""}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5">
            <p className="mb-1 text-xs font-semibold text-violet-800">
              AIでもっと強くする（改善版のプレビュー）
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-800">
              {report.aiCheck.improvedText}
            </p>
            <p className="mt-1 text-[11px] text-violet-700">
              変更点: {report.aiCheck.improvementNote}
            </p>
            <form action={applyAction} className="mt-2">
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

          <p className="text-[11px] text-ink-400">
            「このまま投稿」する場合は、そのまま下の予約フォームで日時を指定してください。
          </p>
          <FormError message={applyState.error} />
          <FormSuccess message={applyState.success} />
        </div>
      ) : null}
    </div>
  );
}

function CheckButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "チェック中..."
        : hasReport
          ? "投稿前AIチェックを再実行"
          : "投稿前AIチェック"}
    </button>
  );
}

function ApplyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "差し替え中..." : "この改善版に差し替える"}
    </button>
  );
}
