/** Элемент списка альбомов на профиле (GET /users/:id/albums). */
export type PhotoAlbumListItem = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  objectId: string | null;
  /** Привязка к ленте альбомов сообщества (если задано). */
  communityId?: string | null;
  photoCount: number;
  createdAt: string;
  object?: { id: string; title: string } | null;
};

export type AlbumPhotoItem = {
  id: string;
  albumId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

/** Детали альбома с фото (GET /albums/:id, PUT /albums/:id). */
export type PhotoAlbumDetail = PhotoAlbumListItem & {
  photos: AlbumPhotoItem[];
};
