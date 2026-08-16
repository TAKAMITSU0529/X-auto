import { PageHeader } from "@/components/ui";
import { TrendForm } from "./trend-form";

/**
 * ジャンル・トレンド分析 (F-11 / TREND RADAR)。
 * 直近7日の検索結果をAIが4分類し、投稿ネタ候補を提案する。
 */
export default function TrendsPage() {
  return (
    <>
      <PageHeader
        eyebrow="調べる"
        title="トレンド分析"
        description="ジャンルを指定すると、直近の高反応投稿から「いま何が伸びているか」「どこが空いているか」をAIが分類します。"
      />
      <TrendForm />
    </>
  );
}
