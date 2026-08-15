"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  MAX_PILLARS,
  PURPOSE_DEFS,
  savePillarSetting,
  type Pillar,
} from "@/lib/pillars/service";

export type PillarsFormState = {
  error: string | null;
  success: string | null;
};

const rowSchema = z.object({
  name: z.string().trim().max(40),
  ratio: z.coerce.number().int().min(0).max(100),
  keywords: z.string().trim().max(200),
});

export async function savePillarsAction(
  _prev: PillarsFormState,
  formData: FormData,
): Promise<PillarsFormState> {
  const userId = await requireUserId();

  const pillars: Pillar[] = [];
  for (let i = 0; i < MAX_PILLARS; i++) {
    const parsed = rowSchema.safeParse({
      name: formData.get(`pillar-${i}-name`) ?? "",
      ratio: formData.get(`pillar-${i}-ratio`) || 0,
      keywords: formData.get(`pillar-${i}-keywords`) ?? "",
    });
    if (!parsed.success) {
      return {
        error: `柱${i + 1}: ${parsed.error.issues[0]?.message ?? "入力を確認してください"}`,
        success: null,
      };
    }
    if (parsed.data.name.length === 0) continue;

    pillars.push({
      name: parsed.data.name,
      ratio: parsed.data.ratio,
      keywords: parsed.data.keywords
        .split(/[,、]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .slice(0, 10),
    });
  }

  const purposeRatios: Record<string, number> = {};
  let purposeTotal = 0;
  for (const def of PURPOSE_DEFS) {
    const raw = formData.get(`purpose-${def.key}`);
    const value = z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .safeParse(raw || 0);
    if (!value.success) {
      return { error: `${def.label} の比率が不正です`, success: null };
    }
    purposeRatios[def.key] = value.data;
    purposeTotal += value.data;
  }
  if (purposeTotal > 100) {
    return {
      error: `目的別比率の合計が100%を超えています (現在 ${purposeTotal}%)`,
      success: null,
    };
  }

  try {
    await savePillarSetting({ userId, pillars, purposeRatios });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存に失敗しました",
      success: null,
    };
  }

  revalidatePath("/pillars");
  return { error: null, success: "CONTENT PILLARS を保存しました" };
}
