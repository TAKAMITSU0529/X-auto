import { ApiType } from "@prisma/client";
import { env } from "@/lib/env";
import { withApiGuard } from "@/lib/usage/guard";
import { ClaudeAiProvider } from "@/lib/ai/claude";
import { MockAiProvider } from "@/lib/ai/mock";
import type {
  AiProvider,
  BatchAnalysisResult,
  DraftResult,
  DraftScore,
  PostAnalysisResult,
  StructureBlock,
  TrendAnalysisResult,
  WeeklyReportResult,
} from "@/lib/ai/provider";

export * from "@/lib/ai/provider";
export { AiConfigurationError } from "@/lib/ai/claude";

export function createAiProvider(): AiProvider {
  return env.AI_MODE === "real" ? new ClaudeAiProvider() : new MockAiProvider();
}

export function isAiMockMode(): boolean {
  return env.AI_MODE !== "real";
}

/**
 * ユーザー単位の AI ファサード。
 * X API と同様、BUDGET LIMIT の判定と api_usage への記録を必ず通す (F-25)。
 */
export class AiService {
  private readonly provider: AiProvider;

  constructor(private readonly userId: string) {
    this.provider = createAiProvider();
  }

  async analyzePost(input: {
    text: string;
    authorHandle: string;
  }): Promise<PostAnalysisResult> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.analyzePost",
      units: 1,
      run: async () => ({ result: await this.provider.analyzePost(input) }),
    });
  }

  async generateDrafts(input: {
    sourceText?: string;
    structure?: StructureBlock[];
    genre: string;
    message: string;
    brand?: {
      basicInfo?: unknown;
      style?: unknown;
      prohibited?: unknown;
    };
  }): Promise<DraftResult[]> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.generateDrafts",
      units: 1,
      run: async () => ({ result: await this.provider.generateDrafts(input) }),
    });
  }

  async analyzeBatch(input: {
    posts: { text: string; outlierScore: number }[];
    accountHandle: string;
  }): Promise<BatchAnalysisResult> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.analyzeBatch",
      units: 1,
      run: async () => ({ result: await this.provider.analyzeBatch(input) }),
    });
  }

  async scoreDrafts(input: {
    drafts: { label: string; text: string }[];
    genre: string;
    brand?: unknown;
  }): Promise<DraftScore[]> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.scoreDrafts",
      units: 1,
      run: async () => ({ result: await this.provider.scoreDrafts(input) }),
    });
  }

  async generateWeeklyReport(input: {
    stats: unknown;
  }): Promise<WeeklyReportResult> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.summarize",
      units: 1,
      run: async () => ({
        result: await this.provider.generateWeeklyReport(input),
      }),
    });
  }

  async analyzeTrends(input: {
    genre: string;
    posts: { text: string; likes: number }[];
  }): Promise<TrendAnalysisResult> {
    return withApiGuard({
      userId: this.userId,
      apiType: ApiType.ai,
      endpoint: "ai.analyzeTrends",
      units: 1,
      run: async () => ({ result: await this.provider.analyzeTrends(input) }),
    });
  }
}
