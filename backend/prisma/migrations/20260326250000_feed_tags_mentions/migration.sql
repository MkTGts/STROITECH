-- CreateTable
CREATE TABLE "feed_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_tags" (
    "post_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "feed_post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_tags_slug_key" ON "feed_tags"("slug");

-- CreateIndex
CREATE INDEX "feed_post_tags_tag_id_idx" ON "feed_post_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "feed_post_tags" ADD CONSTRAINT "feed_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feed_post_tags" ADD CONSTRAINT "feed_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "feed_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "feed_posts" ADD COLUMN "mentions" JSONB NOT NULL DEFAULT '[]';
