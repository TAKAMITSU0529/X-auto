-- CreateTable
CREATE TABLE "marketing_strategies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "who_json" JSONB,
    "what_json" JSONB,
    "why_json" JSONB,
    "how_json" JSONB,
    "insight_json" JSONB,
    "playbook_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pillar_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pillars_json" JSONB NOT NULL,
    "purpose_ratio_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pillar_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_strategies_user_id_key" ON "marketing_strategies"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_items_user_id_created_at_idx" ON "knowledge_items"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_pillar_settings_user_id_key" ON "content_pillar_settings"("user_id");

-- AddForeignKey
ALTER TABLE "marketing_strategies" ADD CONSTRAINT "marketing_strategies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pillar_settings" ADD CONSTRAINT "content_pillar_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
