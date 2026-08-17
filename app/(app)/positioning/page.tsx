import { PageHeader } from "@/components/ui";
import { PositioningForm } from "./positioning-form";

/**
 * ポジショニング分析 & プロフィール生成 (F-12)。
 */
export default function PositioningPage() {
  return (
    <>
      <PageHeader
        eyebrow="戦略を決める"
        title="ポジショニング"
        description="登録済みの競合をAIが2軸でマッピングし、空いている立ち位置と、その立ち位置に基づくプロフィール3案を提案します（追加のX APIコストは掛かりません）。"
      />
      <PositioningForm />
    </>
  );
}
