export enum NotificationType {
  NEW_OBJECT = "new_object",
  MESSAGE = "message",
  TENDER = "tender",
  SYSTEM = "system",
  NEW_FOLLOWER = "new_follower",
}

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};
