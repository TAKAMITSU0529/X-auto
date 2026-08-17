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
/**
 * マイグレーションは「直接接続」で行う必要がある。
 *
 * Neon / Supabase などのマネージドPostgresは既定でコネクションプーラ
 * (PgBouncer) 経由のURLを渡してくるが、トランザクションプーリングでは
 * マイグレーションが使うアドバイザリロックが効かず失敗する。
 * 各サービスがプーラ無しのURLを別名で用意するので、あればそちらを優先する。
 * ローカル開発では DATABASE_URL だけがあり、そのまま使われる。
 */
const migrationUrl =
  process.env.DIRECT_DATABASE_URL ??
  // Neon (Vercel 連携が自動で設定する名前)
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: migrationUrl!,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
