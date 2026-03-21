-- CreateEnum
CREATE TYPE "FeedPostStatus" AS ENUM ('published');

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220),
    "excerpt" VARCHAR(500),
    "body" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "status" "FeedPostStatus" NOT NULL DEFAULT 'published',
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_views" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_likes" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_posts_slug_key" ON "feed_posts"("slug");

-- CreateIndex
CREATE INDEX "feed_posts_author_id_idx" ON "feed_posts"("author_id");

-- CreateIndex
CREATE INDEX "feed_posts_published_at_idx" ON "feed_posts"("published_at" DESC);

-- CreateIndex
CREATE INDEX "feed_posts_status_published_at_idx" ON "feed_posts"("status", "published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "feed_post_views_post_id_viewer_id_key" ON "feed_post_views"("post_id", "viewer_id");

-- CreateIndex
CREATE INDEX "feed_post_views_post_id_idx" ON "feed_post_views"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_post_likes_post_id_user_id_key" ON "feed_post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "feed_comments_post_id_idx" ON "feed_comments"("post_id");

-- CreateIndex
CREATE INDEX "feed_comments_post_id_created_at_idx" ON "feed_comments"("post_id", "created_at");

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_views" ADD CONSTRAINT "feed_post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_views" ADD CONSTRAINT "feed_post_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
