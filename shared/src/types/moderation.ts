export type ContentReportTargetType = "feed_post" | "feed_comment";

export type ContentReportStatus = "pending" | "closed";

export type ContentReportQueueItem = {
  id: string;
  reporterId: string;
  reporter: { id: string; name: string };
  targetType: ContentReportTargetType;
  targetId: string;
  details: string | null;
  status: ContentReportStatus;
  createdAt: string;
  closedAt: string | null;
  closedById: string | null;
  targetPreview: { label: string; postId?: string };
};

export type ModerationMetrics = {
  period: { from: string; to: string };
  /** Уникальные пользователи с активностью в периоде (просмотры ленты, лайки, посты, комментарии, чат). */
  visitingUsers: number;
  newUsers: number;
  newFeedPosts: number;
  newFollows: number;
  distinctPostAuthors: number;
  distinctCommentAuthors: number;
  distinctActiveUsers: number;
  /** Объявления со статусом active, createdAt в периоде. */
  publishedListings: number;
  /** Объекты active|completed, видимые, createdAt в периоде. */
  publishedObjects: number;
  /** Количество отправленных сообщений в чате. */
  chatMessagesSent: number;
};
