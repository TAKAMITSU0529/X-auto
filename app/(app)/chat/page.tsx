import { PageHeader } from "@/components/ui";
import { ChatPanel } from "./chat-panel";

/**
 * AI CHAT (F-22)。
 * 蓄積データ (実績・柱・ベンチマーク・戦略) を文脈に持つ対話型AI。
 * 回答は §9 のルール (DATA / HYPOTHESIS / ACTION) に従って表示する。
 */
export default function ChatPage() {
  return (
    <>
      <PageHeader
        title="AI CHAT"
        description="X AUTO に蓄積されたあなたのデータをすべて文脈に持つ相談相手です。「最近何が伸びてる？」「何を発信すべき？」などを聞けます。"
      />
      <ChatPanel />
    </>
  );
}
