-- CreateEnum
CREATE TYPE "FeedPostKind" AS ENUM ('article', 'wall');

-- AlterTable
ALTER TABLE "feed_posts" ADD COLUMN "kind" "FeedPostKind" NOT NULL DEFAULT 'article';

ALTER TABLE "feed_posts" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "feed_posts_status_kind_published_at_idx" ON "feed_posts"("status", "kind", "published_at" DESC);
