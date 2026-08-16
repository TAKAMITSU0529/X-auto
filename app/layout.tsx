import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

/**
 * 欧文は Inter、和文は Noto Sans JP。
 * 数値・英語ラベルが多い管理画面なので、字形の癖が少なく判読性の高い組み合わせにする。
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

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
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
