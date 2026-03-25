-- AlterEnum
ALTER TYPE "FeedPostKind" ADD VALUE IF NOT EXISTS 'share';

-- CreateEnum
CREATE TYPE "ShareTargetType" AS ENUM ('feed_post', 'listing', 'construction_object');

-- AlterTable
ALTER TABLE "feed_posts" ADD COLUMN "share_target" "ShareTargetType",
ADD COLUMN "share_target_id" UUID;
