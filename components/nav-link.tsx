"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}
