export enum ContextType {
  LISTING = "listing",
  OBJECT = "object",
  PROFILE = "profile",
}

export type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  contextType: ContextType;
  contextId: string | null;
  lastMessageAt: string | null;
  lastMessage?: Message;
  participant?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    companyName: string | null;
  };
  unreadCount?: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export type SendMessagePayload = {
  conversationId: string;
  content: string;
};

export type StartConversationPayload = {
  participantId: string;
  contextType: ContextType;
  contextId?: string;
  initialMessage: string;
};

export enum WsEventType {
  NEW_MESSAGE = "new_message",
  MESSAGE_READ = "message_read",
  TYPING = "typing",
  ONLINE_STATUS = "online_status",
  NEW_NOTIFICATION = "new_notification",
}

export type WsMessage = {
  type: WsEventType;
  payload: unknown;
};
