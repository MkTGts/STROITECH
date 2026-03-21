export type FeedAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  companyName: string | null;
};

export type FeedPostListItem = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
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
  /** Число корневых комментариев (веток); пагинация по ним */
  rootCommentsTotal: number;
  comments: FeedComment[];
  commentsPage: number;
  commentsLimit: number;
  commentsTotalPages: number;
};

/** Ответ GET /feed/posts/:id для экрана редактирования (без полного DTO ленты). */
export type FeedPostEditLoad = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  author: { id: string; name: string };
};
