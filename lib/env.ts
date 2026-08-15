import { z } from "zod";

/**
 * 環境変数の検証。
 * 外部APIのキーは mock モードでは不要なため optional にし、
 * real モードに切り替えた時点で欠落が明示的なエラーになるようにしている
 * (lib/x-api/index.ts, lib/ai/index.ts で検証)。
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL は必須です"),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET は必須です"),

  X_API_MODE: z.enum(["mock", "real"]).default("mock"),
  AI_MODE: z.enum(["mock", "real"]).default("mock"),

  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  X_OAUTH_REDIRECT_URI: z
    .string()
    .default("http://localhost:3000/api/x/callback"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  DEFAULT_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(30),
  DEFAULT_BUDGET_WARNING_RATIO: z.coerce.number().min(0).max(1).default(0.8),
  POST_CACHE_TTL_HOURS: z.coerce.number().positive().default(24),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `環境変数の検証に失敗しました。.env.example を参考に .env を作成してください。\n${issues}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();

export type Env = typeof env;
