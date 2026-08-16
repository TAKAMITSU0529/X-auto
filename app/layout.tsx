import type { Metadata, Viewport } from "next";
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
  // ホーム画面に追加したときに単独アプリとして開き、名前もロゴに合わせる
  appleWebApp: {
    capable: true,
    title: "X AUTO",
    // ステータスバーを黒地に溶け込ませる
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // 起動時とステータスバーの色をロゴの黒に合わせる
  themeColor: "#0b0e15",
  // ホーム画面起動時にセーフエリア (ノッチ・ホームバー) を扱えるようにする
  viewportFit: "cover",
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
