-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('admin', 'moderator', 'member');

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "region" VARCHAR(200),
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communities_region_idx" ON "communities"("region");

-- CreateIndex
CREATE INDEX "communities_created_at_idx" ON "communities"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_community_id_user_id_key" ON "community_members"("community_id", "user_id");

-- CreateIndex
CREATE INDEX "community_members_user_id_idx" ON "community_members"("user_id");

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "feed_posts" ADD COLUMN "community_id" UUID;

-- AlterTable
ALTER TABLE "photo_albums" ADD COLUMN "community_id" UUID;

-- CreateIndex
CREATE INDEX "feed_posts_community_id_published_at_idx" ON "feed_posts"("community_id", "published_at" DESC);

-- CreateIndex
CREATE INDEX "photo_albums_community_id_idx" ON "photo_albums"("community_id");

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
