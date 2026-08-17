import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト。
 *
 * スマホのホーム画面に追加したときに、ブラウザのタブではなく
 * 単独アプリとして起動し、アイコン・起動画面もブランドの見た目になるようにする。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "X AUTO",
    short_name: "X AUTO",
    description:
      "Xリサーチ・競合分析・戦略設計・投稿生成・予約投稿・効果測定を統合したSNSグロースOS",
    lang: "ja",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // 起動画面とステータスバーをロゴの黒に合わせる
    background_color: "#000000",
    theme_color: "#0b0e15",
    icons: [
      {
        src: "/assets/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // maskable: Android のアダプティブアイコンで切り抜かれても崩れないよう別指定
      {
        src: "/assets/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
