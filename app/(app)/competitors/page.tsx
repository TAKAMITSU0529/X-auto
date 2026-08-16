import { PageHeader } from "@/components/ui";
import { DiscoverForm } from "./discover-form";

/**
 * 競合発見エンジン (F-08)。
 * キーワード検索で同ジャンルの発信者を発見し、AI が COMPETITOR SCORE で採点する。
 */
export default function CompetitorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="戦略を決める"
        title="競合発見"
        description="ジャンルのキーワードから同ジャンルの発信者を発見し、ベンチマークとしての適性をAIが採点します。良い候補はワンクリックでベンチマークに追加できます。"
      />
      <DiscoverForm />
    </>
  );
}
