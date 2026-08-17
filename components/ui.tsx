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
  size = "md",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  /** カード内に埋め込むときは sm にして余白を詰める */
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`rounded-card border border-dashed border-ink-300 bg-ink-25 text-center ${
        size === "sm" ? "px-4 py-7" : "px-6 py-12"
      }`}
    >
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">
        {description}
      </p>
      {action ? (
        <div className={size === "sm" ? "mt-3.5" : "mt-5"}>{action}</div>
      ) : null}
    </div>
  );
}

/** カード内の小見出し。セクションを区切るときに使う */
export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        {children}
      </p>
      {action}
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
 * §9 の3区分の表示。
 * children に本文を渡すか、items に箇条書きを渡す（両方可）。
 * 区分は色とラベル文字の両方で示し、色覚に依存させない。
 */
function Note({
  tone,
  label,
  children,
  items,
}: {
  tone: "data" | "hypothesis" | "action";
  label: string;
  children?: React.ReactNode;
  items?: string[];
}) {
  const styles = {
    data: {
      box: "border-ink-200 bg-ink-50",
      text: "text-ink-700",
      dot: "bg-ink-400",
    },
    hypothesis: {
      box: "border-violet-200/80 bg-violet-50/70",
      text: "text-violet-900",
      dot: "bg-violet-400",
    },
    action: {
      box: "border-emerald-200 bg-emerald-50/70",
      text: "text-emerald-900",
      dot: "bg-emerald-500",
    },
  }[tone];

  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${styles.box}`}>
      <div className="flex gap-2.5">
        <Tag tone={tone}>{label}</Tag>
        {children ? (
          <span className={`text-[13px] leading-relaxed ${styles.text}`}>
            {children}
          </span>
        ) : null}
      </div>
      {items && items.length > 0 ? (
        <ul className={`mt-2 space-y-1 ${children ? "" : "-mt-4 pl-[4.5rem]"}`}>
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex gap-2 text-[13px] leading-relaxed ${styles.text}`}
            >
              <span
                className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${styles.dot}`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * AI による解説・仮説の表示 (要件定義 §9)。
 * 事実 (DATA) と区別するため、必ず「AI推定」であることを明示する。
 */
export function HypothesisNote({
  children,
  items,
}: {
  children?: React.ReactNode;
  items?: string[];
}) {
  return (
    <Note tone="hypothesis" label="AI推定" items={items}>
      {children}
    </Note>
  );
}

/** 確認できた事実であることを示すラベル (要件定義 §9 DATA) */
export function DataNote({
  children,
  items,
}: {
  children?: React.ReactNode;
  items?: string[];
}) {
  return (
    <Note tone="data" label="DATA" items={items}>
      {children}
    </Note>
  );
}

/** 次の行動であることを示すラベル (要件定義 §9 ACTION) */
export function ActionNote({
  children,
  items,
}: {
  children?: React.ReactNode;
  items?: string[];
}) {
  return (
    <Note tone="action" label="ACTION" items={items}>
      {children}
    </Note>
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

/** ボタンの見た目だけが欲しいとき (a[download] など) に使うクラス */
export function buttonClassName({
  variant = "primary",
  size = "md",
}: {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
} = {}): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

/** リンクとして機能するボタン。external を付けると素の <a> になる */
export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  external = false,
  download,
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
  /** ルートハンドラや外部URLなど next/link を通さない遷移に使う */
  external?: boolean;
  download?: boolean;
}) {
  const cls = `${buttonClassName({ variant, size })} ${className}`;

  if (external || download) {
    return (
      <a href={href} className={cls} download={download}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/**
 * 通常のボタン。フォーム送信は SubmitButton (useFormStatus) を使うため、
 * こちらはクライアント状態で pending を制御する場合に使う。
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  type?: "button" | "submit" | "reset";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${buttonClassName({ variant, size })} ${className}`}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** 処理中を示すスピナー */
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const STATUS_STYLES = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-brand-50 text-brand-700 ring-brand-200",
  neutral: "bg-ink-50 text-ink-600 ring-ink-200",
} as const;

/**
 * 状態バッジ。連携済み / 期限切れ / 上限到達 などの表示に使う。
 * §9 の3区分 (DATA/HYPOTHESIS/ACTION) とは別物なので Tag と混ぜない。
 */
export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof STATUS_STYLES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${STATUS_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * 0〜100 のスコアバッジ (COMPETITOR SCORE / POSITIONING SCORE)。
 * いずれも AI推定なので、単独で使わず AI推定の文脈の中に置くこと。
 */
export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? "info" : score >= 60 ? "ok" : score >= 40 ? "warn" : "neutral";
  return (
    <span
      className={`inline-flex w-[3.25rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset ${STATUS_STYLES[tone]}`}
    >
      {Math.round(score)}
      <span className="ml-0.5 text-[9px] font-semibold opacity-60">/100</span>
    </span>
  );
}

/** 絞り込み用のチップ (リンク型)。並び替え・タグ絞り込みに使う */
export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition duration-200 ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-white text-ink-600 shadow-xs hover:border-ink-300 hover:bg-ink-50"
      }`}
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

/**
 * 比率バー。
 * targetRatio を渡すと目標位置に目盛りが重なり、1本で
 * 「設計値と実測値のズレ」を表現できる (CONTENT PILLARS など)。
 */
export function MeterBar({
  ratio,
  tone = "brand",
  targetRatio,
  className = "",
}: {
  /** 0〜1 */
  ratio: number;
  tone?: "brand" | "emerald" | "amber" | "rose" | "ink";
  /** 0〜1。目標値の目盛りを重ねる */
  targetRatio?: number;
  className?: string;
}) {
  const fill = {
    brand: "bg-gradient-to-r from-brand-400 to-brand-600",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    amber: "bg-gradient-to-r from-amber-400 to-amber-500",
    rose: "bg-gradient-to-r from-rose-400 to-rose-600",
    ink: "bg-ink-400",
  }[tone];

  return (
    <div className={`relative h-2 rounded-full bg-ink-100 ${className}`}>
      <div className="h-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${fill}`}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
      {targetRatio !== undefined ? (
        <span
          aria-hidden="true"
          title={`目標 ${Math.round(targetRatio * 100)}%`}
          className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-ink-500"
          style={{
            left: `${Math.min(100, Math.max(0, targetRatio * 100))}%`,
          }}
        />
      ) : null}
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
