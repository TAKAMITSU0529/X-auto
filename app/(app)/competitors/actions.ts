"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  addCompetitorToBenchmark,
  discoverCompetitors,
  type DiscoveredCompetitor,
} from "@/lib/competitors/service";
import { BudgetExceededError } from "@/lib/usage/guard";

export type DiscoverState = {
  error: string | null;
  genre: string | null;
  candidates: DiscoveredCompetitor[] | null;
};

const discoverSchema = z.object({
  genre: z.string().trim().min(1, "ジャンルを入力してください").max(60),
});

export async function discoverAction(
  _prev: DiscoverState,
  formData: FormData,
): Promise<DiscoverState> {
  const userId = await requireUserId();

  const parsed = discoverSchema.safeParse({ genre: formData.get("genre") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力を確認してください",
      genre: null,
      candidates: null,
    };
  }

  try {
    const { candidates } = await discoverCompetitors({
      userId,
      genre: parsed.data.genre,
    });
    return { error: null, genre: parsed.data.genre, candidates };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return { error: error.message, genre: null, candidates: null };
    }
    return {
      error: error instanceof Error ? error.message : "競合発見に失敗しました",
      genre: null,
      candidates: null,
    };
  }
}

export type AddState = { error: string | null; success: string | null };

const addSchema = z.object({
  genre: z.string().trim().min(1).max(60),
  xUserId: z.string().min(1),
  handle: z.string().min(1),
  displayName: z.string(),
  profile: z.string(),
  url: z.string(),
  followers: z.coerce.number().int().min(0),
  following: z.coerce.number().int().min(0),
  postsCount: z.coerce.number().int().min(0),
});

export async function addCompetitorAction(
  _prev: AddState,
  formData: FormData,
): Promise<AddState> {
  const userId = await requireUserId();

  const parsed = addSchema.safeParse({
    genre: formData.get("genre"),
    xUserId: formData.get("xUserId"),
    handle: formData.get("handle"),
    displayName: formData.get("displayName") ?? "",
    profile: formData.get("profile") ?? "",
    url: formData.get("url") ?? "",
    followers: formData.get("followers"),
    following: formData.get("following"),
    postsCount: formData.get("postsCount"),
  });

  if (!parsed.success) {
    return { error: "候補データが不正です", success: null };
  }

  const { listName } = await addCompetitorToBenchmark({
    userId,
    genre: parsed.data.genre,
    user: {
      xUserId: parsed.data.xUserId,
      handle: parsed.data.handle,
      displayName: parsed.data.displayName,
      profile: parsed.data.profile || null,
      url: parsed.data.url || null,
      followers: parsed.data.followers,
      following: parsed.data.following,
      postsCount: parsed.data.postsCount,
    },
  });

  revalidatePath("/benchmarks");
  revalidatePath("/research");
  return {
    error: null,
    success: `@${parsed.data.handle} を「${listName}」に追加しました`,
  };
}
