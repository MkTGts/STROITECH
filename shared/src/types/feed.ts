export type FeedAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  companyName: string | null;
};

export type FeedPostKind = "article" | "wall" | "share";

export type ShareTargetType = "feed_post" | "listing" | "construction_object";

/** Превью оригинала для репоста (kind=share). */
export type FeedSharePreview = {
  available: boolean;
  targetType: ShareTargetType;
  targetId: string;
  title: string;
  imageUrl: string | null;
  /** Относительный путь в приложении (например /lenta/uuid). */
  path: string;
};

export type FeedMentionUser = { id: string; name: string };

export type FeedPostListItem = {
  id: string;
  kind: FeedPostKind;
  title: string;
  slug: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  /** URL изображений записи стены (порядок галереи). */
  attachments: string[];
  shareTarget?: ShareTargetType | null;
  shareTargetId?: string | null;
  sharePreview?: FeedSharePreview;
  /** Текст записи; в списке отдаётся для kind=wall, для статей не включается (экономия). */
  body?: string;
  /** Нормализованные slug хэштегов из текста поста. */
  tags: string[];
  /** UUID авторов из токенов [[mention:uuid]] (после валидации на бэкенде). */
  mentions: string[];
  /** Имена для отображения упоминаний (порядок совпадает с mentions). */
  mentionUsers: FeedMentionUser[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  likeCount: number;
  uniqueViewCount: number;
  commentCount: number;
  likedByMe?: boolean;
};

export type FeedComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  likeCount: number;
  likedByMe?: boolean;
  replies: FeedComment[];
};

export type FeedPostDetail = FeedPostListItem & {
  body: string;
  status: string;
  likedByMe: boolean;
  /** Число корневых комментариев (веток); пагинация по ним (с бэкенда после миграции веток) */
  rootCommentsTotal?: number;
  comments: FeedComment[];
  commentsPage: number;
  commentsLimit: number;
  commentsTotalPages: number;
};

/** Ответ GET /feed/posts/:id для экрана редактирования (без полного DTO ленты). */
export type FeedPostEditLoad = {
  id: string;
  kind: FeedPostKind;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  attachments: string[];
  shareTarget?: ShareTargetType | null;
  shareTargetId?: string | null;
  sharePreview?: FeedSharePreview | null;
  author: { id: string; name: string };
};
