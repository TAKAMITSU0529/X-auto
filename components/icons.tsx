/**
 * アイコンセット。
 *
 * 外部アイコンライブラリを足すと依存とバンドルが増えるため、
 * 使う分だけをインラインSVGで持つ。線幅・キャップ・24グリッドを揃えて
 * 見た目のトーンを統一している。
 */

type IconProps = {
  className?: string;
};

function Svg({
  children,
  className = "h-[18px] w-[18px]",
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="8.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.7A8.5 8.5 0 1 1 20.5 12Z" />
      <path d="M9 11h6M9 14.5h3.5" />
    </Svg>
  );
}

export function IconBenchmark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 20v-2a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18v2" />
      <circle cx="10" cy="7" r="3.2" />
      <path d="M20 20v-1.8a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3.2 3.2 0 0 1 0 6.1" />
    </Svg>
  );
}

export function IconResearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m20 20-4.7-4.7" />
      <path d="M8.4 10.8h4.8M10.8 8.4v4.8" />
    </Svg>
  );
}

export function IconTrend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3.5 16.5 5-5.2 3.6 3.4 5-5.6" />
      <path d="M21 5.5v4.4h-4.4" />
      <path d="M3.5 20.5h17" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </Svg>
  );
}

export function IconLibrary(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4.5h5.5a2 2 0 0 1 2 2V20a1.8 1.8 0 0 0-1.8-1.6H5Z" />
      <path d="M19.5 4.5H14a2 2 0 0 0-2 2V20a1.8 1.8 0 0 1 1.8-1.6h5.7Z" />
    </Svg>
  );
}

export function IconCompetitor(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 1.8v3.4M12 18.8v3.4M22.2 12h-3.4M5.2 12H1.8" />
    </Svg>
  );
}

export function IconFunnel(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.8 4.5h16.4l-6.3 7.6v7l-3.8 2v-9Z" />
    </Svg>
  );
}

export function IconPositioning(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m14.9 9.1-1.6 4.2-4.2 1.6 1.6-4.2Z" />
    </Svg>
  );
}

export function IconStrategy(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2 20 7v5.6c0 4-3.3 7-8 8.2-4.7-1.2-8-4.2-8-8.2V7Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </Svg>
  );
}

export function IconPillars(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 20.5V13M9.8 20.5V5M15.2 20.5V9.5M20.5 20.5v-6" />
    </Svg>
  );
}

export function IconGenerate(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 4.2 12.4 8 16 9.4 12.4 10.8 11 14.5 9.6 10.8 6 9.4 9.6 8Z" />
      <path d="M17.5 14.2l.7 1.9 1.8.7-1.8.7-.7 1.9-.7-1.9-1.8-.7 1.8-.7Z" />
    </Svg>
  );
}

export function IconSchedule(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.3V12l3.2 1.9" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.8h17M8.5 3.5v3M15.5 3.5v3" />
    </Svg>
  );
}

export function IconAnalytics(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20.5h16.5" />
      <rect x="4" y="12" width="3.6" height="6" rx="1" />
      <rect x="10.2" y="7.5" width="3.6" height="10.5" rx="1" />
      <rect x="16.4" y="4" width="3.6" height="14" rx="1" />
    </Svg>
  );
}

export function IconBrand(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.3l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8Z" />
    </Svg>
  );
}

export function IconKnowledge(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 5.2A2 2 0 0 1 6.5 3.5h13v14.3h-13a2 2 0 0 0-2 2Z" />
      <path d="M4.5 19.8a2 2 0 0 1 2-2h13v2.7h-13a2 2 0 0 1-2-.7Z" />
      <path d="M8.5 7.8h6.5M8.5 11.2h4.5" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5" />
      <path d="m15.5 16.5 4.5-4.5-4.5-4.5M20 12H9.5" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.2 21 19.5H3Z" />
      <path d="M12 10v4M12 16.8v.1" />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.9 9 19.5 11l-5.6 2L12 18.5 10.1 13 4.5 11l5.6-2Z" />
    </Svg>
  );
}
