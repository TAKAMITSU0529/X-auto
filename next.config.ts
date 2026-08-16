import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // 開発インジケーターは既定の左下だとサイドバーのユーザー欄と重なるため右下へ移す
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
