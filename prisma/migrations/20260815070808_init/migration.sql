-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('idea', 'draft', 'ai_generated', 'editing', 'approved', 'scheduled', 'published', 'reusable');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('scheduled', 'posting', 'published', 'failed');

-- CreateEnum
CREATE TYPE "ApiType" AS ENUM ('x', 'ai');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'personal',
    "email_verified" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "x_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "x_user_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display_name" TEXT,
    "profile_image_url" TEXT,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "x_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre_tag" TEXT,
    "memo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_accounts" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "x_user_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display_name" TEXT,
    "profile" TEXT,
    "profile_image_url" TEXT,
    "url" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "posts_count" INTEGER NOT NULL DEFAULT 0,
    "genre" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "memo" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_analyzed_at" TIMESTAMP(3),
    "snapshot" JSONB,

    CONSTRAINT "benchmark_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "benchmark_account_id" TEXT,
    "target" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "cache_hits" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "x_post_id" TEXT NOT NULL,
    "job_id" TEXT,
    "benchmark_account_id" TEXT,
    "author_x_user_id" TEXT NOT NULL,
    "author_handle" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "lang" TEXT,
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_reply" BOOLEAN NOT NULL DEFAULT false,
    "is_repost" BOOLEAN NOT NULL DEFAULT false,
    "is_quote" BOOLEAN NOT NULL DEFAULT false,
    "permalink" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_metrics" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "quotes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "theme" TEXT,
    "target_audience" TEXT,
    "insight_json" JSONB,
    "structure_json" JSONB,
    "template_type" TEXT,
    "hook" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specificity_json" JSONB,
    "cta" TEXT,
    "why_it_works" TEXT,
    "is_hypothesis" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "category_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winning_patterns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern_json" JSONB NOT NULL,
    "avg_performance" DECIMAL(10,4),
    "source_post_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "winning_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "basic_info_json" JSONB,
    "style_json" JSONB,
    "prohibited_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_refs" JSONB,
    "drafts_json" JSONB NOT NULL,
    "predicted_scores" JSONB,
    "selected_text" TEXT,
    "selected_index" INTEGER,
    "similarity_json" JSONB,
    "status" "PostStatus" NOT NULL DEFAULT 'ai_generated',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "generated_post_id" TEXT NOT NULL,
    "x_account_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'scheduled',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "posted_x_post_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "own_posts" (
    "id" TEXT NOT NULL,
    "x_account_id" TEXT NOT NULL,
    "x_post_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "permalink" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "own_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "own_post_metrics" (
    "id" TEXT NOT NULL,
    "own_post_id" TEXT NOT NULL,
    "snapshot_label" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "quotes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "url_clicks" INTEGER,
    "profile_clicks" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "own_post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "api_type" "ApiType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "estimated_cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_limit_usd" DECIMAL(10,2) NOT NULL DEFAULT 30,
    "warning_ratio" DECIMAL(3,2) NOT NULL DEFAULT 0.8,
    "max_posts_per_research" INTEGER NOT NULL DEFAULT 200,
    "enforce_hard_stop" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "x_accounts_user_id_idx" ON "x_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "x_accounts_user_id_x_user_id_key" ON "x_accounts"("user_id", "x_user_id");

-- CreateIndex
CREATE INDEX "benchmark_lists_user_id_idx" ON "benchmark_lists"("user_id");

-- CreateIndex
CREATE INDEX "benchmark_accounts_list_id_idx" ON "benchmark_accounts"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_accounts_list_id_x_user_id_key" ON "benchmark_accounts"("list_id", "x_user_id");

-- CreateIndex
CREATE INDEX "research_jobs_user_id_created_at_idx" ON "research_jobs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "posts_x_post_id_key" ON "posts"("x_post_id");

-- CreateIndex
CREATE INDEX "posts_benchmark_account_id_posted_at_idx" ON "posts"("benchmark_account_id", "posted_at");

-- CreateIndex
CREATE INDEX "posts_author_x_user_id_posted_at_idx" ON "posts"("author_x_user_id", "posted_at");

-- CreateIndex
CREATE INDEX "post_metrics_post_id_fetched_at_idx" ON "post_metrics"("post_id", "fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_metrics_post_id_fetched_at_key" ON "post_metrics"("post_id", "fetched_at");

-- CreateIndex
CREATE INDEX "post_analyses_user_id_idx" ON "post_analyses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_analyses_user_id_post_id_key" ON "post_analyses"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "model_posts_user_id_idx" ON "model_posts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_posts_user_id_post_id_key" ON "model_posts"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "winning_patterns_user_id_idx" ON "winning_patterns"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_user_id_key" ON "brand_profiles"("user_id");

-- CreateIndex
CREATE INDEX "generated_posts_user_id_status_idx" ON "generated_posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_scheduled_at_idx" ON "scheduled_posts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "own_posts_x_post_id_key" ON "own_posts"("x_post_id");

-- CreateIndex
CREATE INDEX "own_posts_x_account_id_posted_at_idx" ON "own_posts"("x_account_id", "posted_at");

-- CreateIndex
CREATE INDEX "own_post_metrics_own_post_id_idx" ON "own_post_metrics"("own_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "own_post_metrics_own_post_id_snapshot_label_key" ON "own_post_metrics"("own_post_id", "snapshot_label");

-- CreateIndex
CREATE INDEX "api_usage_user_id_created_at_idx" ON "api_usage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_user_id_api_type_created_at_idx" ON "api_usage"("user_id", "api_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "budget_settings_user_id_key" ON "budget_settings"("user_id");

-- AddForeignKey
ALTER TABLE "x_accounts" ADD CONSTRAINT "x_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_lists" ADD CONSTRAINT "benchmark_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_accounts" ADD CONSTRAINT "benchmark_accounts_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "benchmark_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_benchmark_account_id_fkey" FOREIGN KEY ("benchmark_account_id") REFERENCES "benchmark_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "research_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_benchmark_account_id_fkey" FOREIGN KEY ("benchmark_account_id") REFERENCES "benchmark_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analyses" ADD CONSTRAINT "post_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analyses" ADD CONSTRAINT "post_analyses_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_posts" ADD CONSTRAINT "model_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_posts" ADD CONSTRAINT "model_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winning_patterns" ADD CONSTRAINT "winning_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_posts" ADD CONSTRAINT "generated_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_generated_post_id_fkey" FOREIGN KEY ("generated_post_id") REFERENCES "generated_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_x_account_id_fkey" FOREIGN KEY ("x_account_id") REFERENCES "x_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "own_posts" ADD CONSTRAINT "own_posts_x_account_id_fkey" FOREIGN KEY ("x_account_id") REFERENCES "x_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "own_post_metrics" ADD CONSTRAINT "own_post_metrics_own_post_id_fkey" FOREIGN KEY ("own_post_id") REFERENCES "own_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_settings" ADD CONSTRAINT "budget_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
