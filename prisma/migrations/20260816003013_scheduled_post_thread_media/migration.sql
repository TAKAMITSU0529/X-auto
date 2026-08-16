-- AlterTable
ALTER TABLE "scheduled_posts" ADD COLUMN     "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thread_texts" TEXT[] DEFAULT ARRAY[]::TEXT[];
