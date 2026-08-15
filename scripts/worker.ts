import "dotenv/config";
import { prisma } from "@/lib/db";
import { processDueScheduledPosts } from "@/lib/scheduling/service";
import { processMetricSnapshots } from "@/lib/analytics/service";

/**
 * バックグラウンド worker (要件定義 F-07 / F-10)。
 *
 * DBバックエンドのジョブ処理。`npm run worker` で Web サーバーとは別プロセス
 * として起動する。
 *   - 30秒ごと: 期限が来た予約投稿を X へ投稿する
 *   - 5分ごと:  自己投稿メトリクスのスナップショットを取得する
 *
 * 負荷が増えた段階で BullMQ 等のジョブキューに差し替える前提の実装
 * (インターフェースは processDueScheduledPosts / processMetricSnapshots のまま)。
 */

const SCHEDULE_INTERVAL_MS = 30 * 1000;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

let running = true;

function log(message: string) {
  console.log(`[worker ${new Date().toISOString()}] ${message}`);
}

async function scheduleLoop() {
  while (running) {
    try {
      const result = await processDueScheduledPosts();
      if (result.processed > 0) {
        log(
          `予約投稿: 対象${result.processed}件 → 投稿${result.published} / リトライ${result.retried} / 失敗${result.failed}`,
        );
      }
    } catch (error) {
      log(`予約投稿処理でエラー: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(SCHEDULE_INTERVAL_MS);
  }
}

async function snapshotLoop() {
  while (running) {
    try {
      const result = await processMetricSnapshots();
      if (result.captured > 0 || result.errors > 0) {
        log(
          `メトリクス取得: 対象${result.checked}投稿 → 記録${result.captured} / 窓逃し${result.skippedMissedWindow} / エラー${result.errors}`,
        );
      }
    } catch (error) {
      log(`メトリクス処理でエラー: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(SNAPSHOT_INTERVAL_MS);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log("worker を起動しました (Ctrl+C で停止)");

  const shutdown = async () => {
    log("停止します...");
    running = false;
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await Promise.all([scheduleLoop(), snapshotLoop()]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
