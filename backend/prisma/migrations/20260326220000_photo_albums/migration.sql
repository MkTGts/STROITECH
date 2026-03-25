-- CreateTable
CREATE TABLE "photo_albums" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "object_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_photos" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "caption" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "construction_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "photo_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "photo_albums_owner_id_created_at_idx" ON "photo_albums"("owner_id", "created_at" DESC);

CREATE INDEX "photo_albums_object_id_idx" ON "photo_albums"("object_id");

CREATE INDEX "album_photos_album_id_sort_order_idx" ON "album_photos"("album_id", "sort_order");
