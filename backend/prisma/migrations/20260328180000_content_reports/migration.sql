-- CreateEnum
CREATE TYPE "ContentReportTargetType" AS ENUM ('feed_post', 'feed_comment');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('pending', 'closed');

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "ContentReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" UUID,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_reports_reporter_id_target_type_target_id_key" ON "content_reports"("reporter_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
