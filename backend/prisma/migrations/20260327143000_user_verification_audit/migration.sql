-- AlterTable
ALTER TABLE "users" ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "verified_by_id" UUID,
ADD COLUMN "verification_note" VARCHAR(500);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "verification_audits" (
    "id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_audits_target_id_idx" ON "verification_audits"("target_id");

-- CreateIndex
CREATE INDEX "verification_audits_created_at_idx" ON "verification_audits"("created_at");

-- AddForeignKey
ALTER TABLE "verification_audits" ADD CONSTRAINT "verification_audits_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_audits" ADD CONSTRAINT "verification_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
