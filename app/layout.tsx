import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X AUTO",
  description:
    "Xリサーチ・競合分析・戦略設計・投稿生成・予約投稿・効果測定を統合したSNSグロースOS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
