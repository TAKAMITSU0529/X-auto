"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconAnalytics,
  IconBenchmark,
  IconBrand,
  IconCalendar,
  IconChat,
  IconClose,
  IconCompetitor,
  IconDashboard,
  IconFunnel,
  IconGenerate,
  IconKnowledge,
  IconLibrary,
  IconMenu,
  IconPillars,
  IconPositioning,
  IconResearch,
  IconSchedule,
  IconSearch,
  IconSettings,
  IconStrategy,
  IconTrend,
} from "@/components/icons";

/**
 * サイドナビゲーション。
 *
 * 機能が18画面あるため、横一列のタブでは破綻する。
 * 「MODEL → ORIGINAL → LEARN」の運用フロー順にグループ分けし、
 * いま自分がサイクルのどこにいるかが分かる並びにしている。
 */

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: IconDashboard },
      { href: "/chat", label: "AI CHAT", icon: IconChat },
    ],
  },
  {
    label: "調べる",
    items: [
      { href: "/benchmarks", label: "ベンチマーク", icon: IconBenchmark },
      { href: "/research", label: "リサーチ", icon: IconResearch },
      { href: "/trends", label: "トレンド", icon: IconTrend },
      { href: "/search", label: "横断検索", icon: IconSearch },
      { href: "/library", label: "ライブラリ", icon: IconLibrary },
    ],
  },
  {
    label: "戦略を決める",
    items: [
      { href: "/competitors", label: "競合発見", icon: IconCompetitor },
      { href: "/funnels", label: "動線分析", icon: IconFunnel },
      { href: "/positioning", label: "ポジショニング", icon: IconPositioning },
      { href: "/strategy", label: "マーケ戦略", icon: IconStrategy },
      { href: "/pillars", label: "コンテンツ設計", icon: IconPillars },
    ],
  },
  {
    label: "作る・出す",
    items: [
      { href: "/generate", label: "生成スタジオ", icon: IconGenerate },
      { href: "/schedule", label: "予約投稿", icon: IconSchedule },
      { href: "/calendar", label: "カレンダー", icon: IconCalendar },
    ],
  },
  {
    label: "伸ばす",
    items: [{ href: "/analytics", label: "自己分析", icon: IconAnalytics }],
  },
  {
    label: "設定",
    items: [
      { href: "/brand", label: "MY BRAND", icon: IconBrand },
      { href: "/knowledge", label: "ナレッジ", icon: IconKnowledge },
      { href: "/settings", label: "設定", icon: IconSettings },
    ],
  },
];

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 画面遷移したらモバイルのドロワーを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* モバイル用のトップバー */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-ink-200 bg-white/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="rounded-lg border border-ink-200 p-2 text-ink-600 transition hover:bg-ink-50"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <Wordmark tone="light" />
      </div>

      {/* モバイルのバックドロップ */}
      {open ? (
        <button
          type="button"
          aria-label="メニューを閉じる"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-gradient-to-b from-ink-950 to-[#11172a] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <Wordmark tone="dark" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="メニューを閉じる"
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.label ?? `top-${i}`}>
              {group.label ? (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition duration-200 ${
                          active
                            ? "bg-brand-600/20 text-white"
                            : "text-ink-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        {/* アクティブ表示は左端のバーで示す (色だけに頼らない) */}
                        <span
                          className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 transition-opacity ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition ${
                            active
                              ? "text-brand-300"
                              : "text-ink-500 group-hover:text-ink-300"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.08] px-3 py-3">{footer}</div>
      </aside>
    </>
  );
}

function Wordmark({ tone }: { tone: "light" | "dark" }) {
  return (
    <Link href="/dashboard" className="flex flex-col gap-1.5">
      {/*
        ロゴはシルバーの金属表現を含むため明るい背景では沈む。
        モバイルのライトなトップバーでは暗い下地を敷いて視認性を保つ。
      */}
      <span
        className={
          tone === "light"
            ? "inline-flex rounded-lg bg-ink-950 px-2.5 py-1.5"
            : "inline-flex"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo-lockup.svg"
          alt="X AUTO"
          width={168}
          height={48}
          className={tone === "light" ? "h-6 w-auto" : "h-9 w-auto"}
        />
      </span>
      {tone === "dark" ? (
        <span className="pl-0.5 text-[9px] font-semibold uppercase tracking-[0.26em] text-ink-500">
          Growth OS
        </span>
      ) : null}
    </Link>
  );
}
