import Link from "next/link";
import {
  OUTLIER_TIER_LABEL,
  outlierTier,
  type OutlierTier,
} from "@/lib/metrics/outlier";
import { IconArrowRight } from "@/components/icons";

/**
 * 共通UIプリミティブ。
 *
 * 要件定義 §8.1 の「数字 → AI解説 → 次にやること」の3段構成を
 * StatTile / DataNote・HypothesisNote / NextActionButton で表現する。
 * §9 の DATA・HYPOTHESIS・ACTION の区別は色とラベルの両方で示し、
 * 色覚に依存しないようにしている。
 */

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** 見出しの上に出す小見出し (どの機能群の画面かを示す) */
  eyebrow?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[26px] font-bold leading-tight text-ink-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  /** ホバーで少し持ち上げる (クリックできるカードに使う) */
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-ink-200/70 bg-white p-5 shadow-card ${
        interactive
          ? "transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-card-hover"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** カード内の見出し。説明文とアクションを揃えて置ける */
export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
    <div className="rounded-card border border-dashed border-ink-300 bg-ink-25 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
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
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  /** 主要指標を1つだけ強調したいときに使う */
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-4 shadow-xs transition duration-300 hover:shadow-sm ${
        accent
          ? "border-brand-200 bg-gradient-to-br from-brand-50 to-white"
          : "border-ink-200/70 bg-white"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        {label}
      </p>
      <p
        className={`mt-2 text-[26px] font-bold leading-none tabular-nums ${
          accent ? "text-brand-700" : "text-ink-900"
        }`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-2 text-[11px] leading-snug text-ink-400">{sub}</p>
      ) : null}
    </div>
  );
}

/**
 * AI による解説・仮説の表示 (要件定義 §9)。
 * 事実 (DATA) と区別するため、必ず「AI推定」であることを明示する。
 */
export function HypothesisNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3.5 py-2.5">
      <Tag tone="hypothesis">AI推定</Tag>
      <span className="text-[13px] leading-relaxed text-violet-900">
        {children}
      </span>
    </div>
  );
}

/** 確認できた事実であることを示すラベル (要件定義 §9 DATA) */
export function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5">
      <Tag tone="data">DATA</Tag>
      <span className="text-[13px] leading-relaxed text-ink-700">
        {children}
      </span>
    </div>
  );
}

/** 次の行動であることを示すラベル (要件定義 §9 ACTION) */
export function ActionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
      <Tag tone="action">ACTION</Tag>
      <span className="text-[13px] leading-relaxed text-emerald-900">
        {children}
      </span>
    </div>
  );
}

const TAG_STYLES = {
  data: "bg-ink-200 text-ink-700",
  hypothesis: "bg-violet-200 text-violet-800",
  action: "bg-emerald-200 text-emerald-800",
  brand: "bg-brand-100 text-brand-700",
  neutral: "border border-ink-200 bg-white text-ink-600",
} as const;

/** 小さな区分ラベル */
export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TAG_STYLES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center rounded px-1.5 text-[10px] font-bold tracking-wide ${TAG_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_6px_16px_-8px_rgba(43,79,230,0.7)] hover:from-brand-600 hover:to-brand-700 hover:shadow-[0_1px_2px_rgba(16,24,40,0.1),0_10px_20px_-10px_rgba(43,79,230,0.8)]",
  secondary:
    "border border-ink-200 bg-white text-ink-700 shadow-xs hover:border-ink-300 hover:bg-ink-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
} as const;

const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2",
  lg: "px-5 py-2.5",
} as const;

/** リンクとして機能するボタン */
export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {children}
    </Link>
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
        className={`${BUTTON_BASE} ${BUTTON_SIZES.sm} cursor-not-allowed border border-ink-200 bg-ink-50 text-ink-400`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS.primary} ${BUTTON_SIZES.sm} group`}
    >
      {children}
      <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

const TIER_STYLES: Record<OutlierTier, string> = {
  extreme: "bg-rose-50 text-rose-700 ring-rose-200",
  strong: "bg-orange-50 text-orange-700 ring-orange-200",
  above: "bg-amber-50 text-amber-700 ring-amber-200",
  normal: "bg-ink-50 text-ink-600 ring-ink-200",
  below: "bg-ink-50 text-ink-400 ring-ink-200",
};

/** 外れ値スコアのバッジ (F-14) */
export function OutlierBadge({ score }: { score: number }) {
  const tier = outlierTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset ${TIER_STYLES[tier]}`}
      title={OUTLIER_TIER_LABEL[tier]}
    >
      通常の{score.toFixed(1)}倍
    </span>
  );
}

/** 比率バー。設計値と実測値の比較などに使う */
export function MeterBar({
  ratio,
  tone = "brand",
  className = "",
}: {
  /** 0〜1 */
  ratio: number;
  tone?: "brand" | "emerald" | "amber" | "ink";
  className?: string;
}) {
  const fill = {
    brand: "bg-gradient-to-r from-brand-400 to-brand-600",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    amber: "bg-gradient-to-r from-amber-400 to-amber-500",
    ink: "bg-ink-400",
  }[tone];

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-ink-100 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${fill}`}
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
      />
    </div>
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
