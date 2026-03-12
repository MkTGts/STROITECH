"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/store";
import { useWsEvent } from "@/lib/hooks";
import { sendWsMessage } from "@/lib/ws";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ConversationItem = {
  id: string;
  participant: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export function ChatPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    const to = searchParams.get("to");
    const context = searchParams.get("context");
    const contextId = searchParams.get("contextId");

    if (to && isAuthenticated) {
      void startNewConversation(to, context || "profile", contextId || undefined);
    }
  }, [searchParams, isAuthenticated]);

  useEffect(() => {
    if (activeConvId) void loadMessages(activeConvId);
  }, [activeConvId]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages]);

  function scrollMessagesToBottom(): void {
    const marker = messagesEndRef.current;
    if (!marker) return;
    const viewport = marker.closest<HTMLElement>("[data-slot=\"scroll-area-viewport\"]");
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }

  useWsEvent("new_message", (payload) => {
    if (payload.conversationId === activeConvId) {
      setMessages((prev) =>
        [...prev, payload as MessageItem].slice().sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      sendWsMessage("message_read", {
        conversationId: activeConvId,
        recipientId: payload.senderId,
      });
    }
    void loadConversations();
  });

  async function loadConversations(): Promise<void> {
    try {
      const res = await api<any>("/chat/conversations");
      setConversations(res.data);
    } catch {
      // ignore
    }
  }

  async function loadMessages(convId: string): Promise<void> {
    try {
      const res = await api<any>(`/chat/conversations/${convId}/messages`);
      setMessages(
        (res.data.items as MessageItem[]).slice().sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    } catch {
      // ignore
    }
  }

  async function startNewConversation(participantId: string, contextType: string, contextId?: string): Promise<void> {
    try {
      const existing = conversations.find((c) => c.participant.id === participantId);
      if (existing) {
        setActiveConvId(existing.id);
        return;
      }

      const res = await api<any>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          participantId,
          contextType,
          contextId,
          initialMessage: "Здравствуйте!",
        }),
      });

      setActiveConvId(res.data.id);
      await loadConversations();
      await loadMessages(res.data.id);
      router.replace("/chat");
    } catch {
      // ignore
    }
  }

  async function handleSend(): Promise<void> {
    if (!newMessage.trim() || !activeConvId || sending) return;
    setSending(true);
    try {
      const res = await api<any>(`/chat/conversations/${activeConvId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage }),
      });
      setMessages((prev) =>
        [...prev, res.data as MessageItem].slice().sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      setNewMessage("");
      void loadConversations();
    } catch {
      // ignore
    }
    setSending(false);
  }

  async function handleStartChat(): Promise<void> {
    const to = searchParams.get("to");
    const context = searchParams.get("context") || "profile";
    const contextId = searchParams.get("contextId") || undefined;

    if (!to || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await api<any>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          participantId: to,
          contextType: context,
          contextId,
          initialMessage: newMessage,
        }),
      });
      setActiveConvId(res.data.id);
      setNewMessage("");
      await loadConversations();
      await loadMessages(res.data.id);
      router.replace("/chat");
    } catch {
      // ignore
    }
    setSending(false);
  }

  if (!isAuthenticated) return null;

  const isNewChat = searchParams.get("to") && !activeConvId;

  return (
    <div className="mx-auto flex max-w-7xl w-full flex-1 overflow-hidden">
      <div
        className={cn(
          "w-full border-r md:w-80 md:block",
          activeConvId ? "hidden md:block" : "block",
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="font-semibold">Диалоги</h2>
        </div>
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Пока нет диалогов
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  router.replace("/chat");
                }}
                className={cn(
                  "flex w-full items-center gap-3 border-b p-4 text-left transition-colors hover:bg-muted",
                  activeConvId === conv.id && "bg-muted",
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conv.participant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">
                      {conv.participant.companyName || conv.participant.name}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          !activeConvId && !isNewChat ? "hidden md:flex" : "flex",
        )}
      >
        {activeConvId || isNewChat ? (
          <>
            <div className="flex h-14 items-center gap-3 border-b px-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {
                  setActiveConvId(null);
                  router.replace("/chat");
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {activeConvId && (
                <p className="font-semibold">
                  {conversations.find((c) => c.id === activeConvId)?.participant.companyName ||
                    conversations.find((c) => c.id === activeConvId)?.participant.name ||
                    "Диалог"}
                </p>
              )}
              {isNewChat && <p className="font-semibold">Новый диалог</p>}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.senderId === user?.id ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        msg.senderId === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          msg.senderId === user?.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isNewChat) {
                    void handleStartChat();
                  } else {
                    void handleSend();
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Написать сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3">Выберите диалог или начните новый</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

