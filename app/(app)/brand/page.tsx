import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BrandForm, type BrandDefaults } from "./brand-form";

/**
 * MY BRAND (F-17 軽量版)。
 * ここで設定した内容は投稿生成 (F-05/F-06) が常に参照し、
 * 「他人の言葉ではなく本人の発信」にするための土台になる。
 */
export default async function BrandPage() {
  const userId = await requireUserId();

  const profile = await prisma.brandProfile.findUnique({ where: { userId } });

  const basic = (profile?.basicInfoJson ?? {}) as Record<string, string | null>;
  const style = (profile?.styleJson ?? {}) as {
    tones?: string[];
    firstPerson?: string | null;
    note?: string | null;
  };
  const prohibited = (profile?.prohibitedJson ?? {}) as {
    expressions?: string | null;
    topics?: string | null;
    noExaggeration?: boolean;
  };

  const defaults: BrandDefaults = {
    displayName: basic.displayName ?? "",
    occupation: basic.occupation ?? "",
    company: basic.company ?? "",
    business: basic.business ?? "",
    expertise: basic.expertise ?? "",
    strengths: basic.strengths ?? "",
    achievements: basic.achievements ?? "",
    products: basic.products ?? "",
    tones: style.tones ?? [],
    firstPerson: style.firstPerson ?? "",
    styleNote: style.note ?? "",
    prohibitedExpressions: prohibited.expressions ?? "",
    prohibitedTopics: prohibited.topics ?? "",
    noExaggeration: prohibited.noExaggeration ?? true,
  };

  return (
    <>
      <PageHeader
        eyebrow="設定"
        title="MY BRAND"
        description="あなた自身の情報・発信スタイル・禁止事項を登録します。投稿生成はこの設定を常に参照し、他人の言葉ではなく「あなたの発信」として出力します。"
      />

      <BrandForm defaults={defaults} />
    </>
  );
}
