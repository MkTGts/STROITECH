-- AlterTable
ALTER TABLE "feed_comments" ADD COLUMN "parent_id" UUID;

-- CreateTable
CREATE TABLE "feed_comment_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_comment_likes_comment_id_user_id_key" ON "feed_comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "feed_comment_likes_comment_id_idx" ON "feed_comment_likes"("comment_id");

-- CreateIndex
CREATE INDEX "feed_comments_parent_id_idx" ON "feed_comments"("parent_id");

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
