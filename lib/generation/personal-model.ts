import type { DraftScore } from "@/lib/ai";
import {
  classifyFormat,
  classifyHook,
  computePerformanceInsights,
} from "@/lib/analytics/insights";

/**
 * Personal Growth Model (要件定義 F-19 / F-52相当)。
 *
 * 「X全体では何が伸びるか」(AIの一般予測) より
 * 「このアカウントでは何が伸びるか」(本人の実測データ) を優先する補正。
 *
 * AIが付けた予測スコアに対して、本人の投稿実績で成績が良かった
 * HOOKタイプ・投稿形式・時間帯と一致する案に加点する。
 * 補正の根拠は実測集計 (DATA) なので、何をなぜ補正したかを必ず明示する。
 */

/** 補正を適用する最小サンプル数。これ未満では一般予測のまま */
export const MIN_PERSONAL_SAMPLE = 3;

export type PersonalAdjustment = {
  applied: boolean;
  /** 加点量 (0〜10) */
  delta: number;
  /** 補正理由 (実測データに基づく) */
  reasons: string[];
  sampleSize: number;
};

export type PersonallyAdjustedScore = DraftScore & {
  /** 補正前のAI一般予測 */
  baseTotal: number;
  personalAdjustment: PersonalAdjustment;
};

export async function applyPersonalCorrection(args: {
  userId: string;
  drafts: { text: string }[];
  scores: DraftScore[];
}): Promise<PersonallyAdjustedScore[]> {
  const insights = await computePerformanceInsights(args.userId);

  const noop = (score: DraftScore): PersonallyAdjustedScore => ({
    ...score,
    baseTotal: score.total,
    personalAdjustment: {
      applied: false,
      delta: 0,
      reasons: [],
      sampleSize: insights.sampleSize,
    },
  });

  if (insights.sampleSize < MIN_PERSONAL_SAMPLE) {
    return args.scores.map(noop);
  }

  return args.scores.map((score, index) => {
    const draft = args.drafts[index];
    if (!draft) return noop(score);

    const hook = classifyHook(draft.text);
    const format = classifyFormat(draft.text);

    let delta = 0;
    const reasons: string[] = [];

    if (insights.best.hook && hook === insights.best.hook) {
      delta += 4;
      reasons.push(
        `書き出しが、あなたの実績で最も伸びている「${hook}」と一致 (+4)`,
      );
    }
    if (insights.best.format && format === insights.best.format) {
      delta += 3;
      reasons.push(
        `投稿形式が、あなたの実績で反応率の高い「${format}」と一致 (+3)`,
      );
    }

    if (delta === 0) return noop(score);

    return {
      ...score,
      total: Math.min(100, score.total + delta),
      baseTotal: score.total,
      personalAdjustment: {
        applied: true,
        delta,
        reasons,
        sampleSize: insights.sampleSize,
      },
    };
  });
}
