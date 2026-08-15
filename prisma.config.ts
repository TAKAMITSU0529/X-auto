import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 の設定ファイル。
 *
 * Prisma 7 では接続URLを schema.prisma の datasource ブロックに書けなくなり、
 * マイグレーション等の CLI 向けにはここで指定する。
 * 実行時のクライアントはドライバアダプタ経由で接続する (lib/db.ts)。
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
