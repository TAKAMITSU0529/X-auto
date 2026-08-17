import { PageHeader } from "@/components/ui";
import { FunnelForm } from "./funnel-form";

/**
 * 競合マネタイズ動線分析 (F-13)。
 * 公開情報から競合の収益導線を FUNNEL MAP として可視化し、
 * 「自分が転用するならこの動線」を提案する。
 */
export default function FunnelsPage() {
  return (
    <>
      <PageHeader
        eyebrow="戦略を決める"
        title="動線分析"
        description="競合が「X投稿 → プロフィール → リスト → 商品」をどう設計しているかを公開情報から分析します。確認できた事実とAIの推定は区別して表示されます。"
      />
      <FunnelForm />
    </>
  );
}
