-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'event_rsvp';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'event_reminder';

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('going', 'maybe', 'not_going');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "venue" VARCHAR(500),
    "creator_id" UUID NOT NULL,
    "community_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "EventRsvpStatus" NOT NULL,
    "reminder_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "events_community_id_starts_at_idx" ON "events"("community_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvps_event_id_user_id_key" ON "event_rsvps"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "event_rsvps_event_id_idx" ON "event_rsvps"("event_id");

-- CreateIndex
CREATE INDEX "event_rsvps_user_id_idx" ON "event_rsvps"("user_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
