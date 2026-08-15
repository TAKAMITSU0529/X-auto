import Link from "next/link";
import {
  OUTLIER_TIER_LABEL,
  outlierTier,
  type OutlierTier,
} from "@/lib/metrics/outlier";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-ink-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * 数値タイル。
 * 要件定義 §8.1 の UI 思想「数字 → AI解説 → 次にやること」の1段目。
 */
export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-400">{sub}</p> : null}
    </div>
  );
}

/**
 * AI による解説・仮説の表示 (要件定義 §9)。
 * 事実 (DATA) と区別するため、必ず「AI推定」であることを明示する。
 */
export function HypothesisNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
      <span className="mr-2 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-800">
        AI推定
      </span>
      <span className="text-sm text-violet-900">{children}</span>
    </div>
  );
}

/** 確認できた事実であることを示すラベル (要件定義 §9 DATA) */
export function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
      <span className="mr-2 rounded bg-ink-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ink-700">
        DATA
      </span>
      <span className="text-sm text-ink-800">{children}</span>
    </div>
  );
}

/**
 * 次の行動ボタン (要件定義 §8.1 の3段目 / §59 AI BUTTON)。
 * 分析画面には必ず「次に何をするか」を置く。
 */
export function NextActionButton({
  href,
  children,
  disabled,
  title,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  if (disabled) {
    return (
      <span
        title={title}
        className="inline-flex cursor-not-allowed items-center rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-400"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
    >
      {children}
    </Link>
  );
}

const TIER_STYLES: Record<OutlierTier, string> = {
  extreme: "bg-rose-100 text-rose-800 border-rose-200",
  strong: "bg-orange-100 text-orange-800 border-orange-200",
  above: "bg-amber-100 text-amber-800 border-amber-200",
  normal: "bg-ink-100 text-ink-600 border-ink-200",
  below: "bg-ink-50 text-ink-400 border-ink-200",
};

/** 外れ値スコアのバッジ (F-14) */
export function OutlierBadge({ score }: { score: number }) {
  const tier = outlierTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}
      title={OUTLIER_TIER_LABEL[tier]}
    >
      通常の{score.toFixed(1)}倍
    </span>
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function formatPercent(rate: number, digits = 2): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
