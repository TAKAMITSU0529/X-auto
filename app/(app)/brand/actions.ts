"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export type BrandFormState = { error: string | null; success: string | null };

const schema = z.object({
  displayName: z.string().trim().max(60).optional(),
  occupation: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  business: z.string().trim().max(500).optional(),
  expertise: z.string().trim().max(500).optional(),
  strengths: z.string().trim().max(500).optional(),
  achievements: z.string().trim().max(500).optional(),
  products: z.string().trim().max(500).optional(),
  tones: z.array(z.string()).max(4, "トーンは4つまでにしてください"),
  firstPerson: z.string().trim().max(20).optional(),
  styleNote: z.string().trim().max(500).optional(),
  prohibitedExpressions: z.string().trim().max(1000).optional(),
  prohibitedTopics: z.string().trim().max(1000).optional(),
  noExaggeration: z.boolean(),
});

export async function saveBrandAction(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const userId = await requireUserId();

  const parsed = schema.safeParse({
    displayName: formData.get("displayName") || undefined,
    occupation: formData.get("occupation") || undefined,
    company: formData.get("company") || undefined,
    business: formData.get("business") || undefined,
    expertise: formData.get("expertise") || undefined,
    strengths: formData.get("strengths") || undefined,
    achievements: formData.get("achievements") || undefined,
    products: formData.get("products") || undefined,
    tones: formData.getAll("tones").map(String),
    firstPerson: formData.get("firstPerson") || undefined,
    styleNote: formData.get("styleNote") || undefined,
    prohibitedExpressions: formData.get("prohibitedExpressions") || undefined,
    prohibitedTopics: formData.get("prohibitedTopics") || undefined,
    noExaggeration: formData.get("noExaggeration") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      success: null,
    };
  }

  const d = parsed.data;

  const basicInfoJson = {
    displayName: d.displayName ?? null,
    occupation: d.occupation ?? null,
    company: d.company ?? null,
    business: d.business ?? null,
    expertise: d.expertise ?? null,
    strengths: d.strengths ?? null,
    achievements: d.achievements ?? null,
    products: d.products ?? null,
  };

  const styleJson = {
    tones: d.tones,
    firstPerson: d.firstPerson ?? null,
    note: d.styleNote ?? null,
  };

  const prohibitedJson = {
    expressions: d.prohibitedExpressions ?? null,
    topics: d.prohibitedTopics ?? null,
    noExaggeration: d.noExaggeration,
  };

  await prisma.brandProfile.upsert({
    where: { userId },
    create: {
      userId,
      basicInfoJson: basicInfoJson as Prisma.InputJsonValue,
      styleJson: styleJson as Prisma.InputJsonValue,
      prohibitedJson: prohibitedJson as Prisma.InputJsonValue,
    },
    update: {
      basicInfoJson: basicInfoJson as Prisma.InputJsonValue,
      styleJson: styleJson as Prisma.InputJsonValue,
      prohibitedJson: prohibitedJson as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/brand");
  return { error: null, success: "MY BRAND を保存しました" };
}
