"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, ArrowLeft, MessageCircle, Check, CheckCheck, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";
import { useWsEvent } from "@/lib/hooks";
import { sendWsMessage } from "@/lib/ws";
import { api, uploadFile, uploadAttachment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const BOT_CONVERSATION_ID = "assistant-bot";
const BOT_SENDER_ID = "assistant-bot";
const BOT_WELCOME_MESSAGE: MessageItem = {
  id: "bot-welcome",
  senderId: BOT_SENDER_ID,
  content: "Здравствуйте! Я «Объекты-Ассистент». Задайте вопрос про работу сервиса или опишите, что вы хотите сделать.",
  isRead: true,
  createdAt: new Date().toISOString(),
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
  const [uploading, setUploading] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  }, [activeConvId, user]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages]);

  function scrollMessagesToBottom(): void {
    const viewport = messagesViewportRef.current;
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

  useWsEvent("message_read", (payload) => {
    // если собеседник прочитал сообщения в текущем диалоге — отмечаем их как прочитанные
    if (payload.conversationId === activeConvId && user) {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === user.id ? { ...m, isRead: true } : m,
        ),
      );
      void loadConversations();
    }
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
    if (convId === BOT_CONVERSATION_ID) {
      if (!user) {
        setMessages([BOT_WELCOME_MESSAGE]);
        return;
      }
      if (typeof window !== "undefined") {
        const key = `assistantChat:${user.id}`;
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            const stored: MessageItem[] = JSON.parse(raw);
            if (Array.isArray(stored) && stored.length > 0) {
              setMessages(
                stored.slice().sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                ),
              );
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      setMessages([BOT_WELCOME_MESSAGE]);
      return;
    }
    try {
      const res = await api<any>(`/chat/conversations/${convId}/messages`);
      setMessages(
        (res.data.items as MessageItem[]).slice().sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      // после открытия диалога все входящие сообщения для текущего пользователя считаем прочитанными
      void loadConversations();

      // уведомляем собеседника, что его сообщения в этом диалоге прочитаны
      const conv = conversations.find((c) => c.id === convId);
      if (conv && user) {
        sendWsMessage("message_read", {
          conversationId: convId,
          recipientId: conv.participant.id,
        });
      }
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
    if (!newMessage.trim() || !activeConvId || sending || botThinking) return;
    setSending(true);
    try {
      if (activeConvId === BOT_CONVERSATION_ID) {
        if (!user) return;
        setBotThinking(true);
        const userMessage: MessageItem = {
          id: `local-${Date.now()}`,
          senderId: user.id,
          content: newMessage,
          isRead: true,
          createdAt: new Date().toISOString(),
        };
        // очищаем инпут сразу, как и в обычных диалогах
        setNewMessage("");
        let nextMessages: MessageItem[] = [];
        setMessages((prev) => {
          nextMessages = [...prev, userMessage].slice().sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          return nextMessages;
        });
        const res = await api<any>("/chat/bot", {
          method: "POST",
          body: JSON.stringify({ content: newMessage }),
        });
        const botMessage: MessageItem = {
          id: `bot-${Date.now()}`,
          senderId: BOT_SENDER_ID,
          content: res.data.reply,
          isRead: true,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => {
          const updated = [...prev, botMessage].slice().sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          if (typeof window !== "undefined" && user) {
            const key = `assistantChat:${user.id}`;
            window.localStorage.setItem(key, JSON.stringify(updated));
          }
          return updated;
        });
      } else {
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
      }
    } catch {
      // ignore
    }
    setSending(false);
    setBotThinking(false);
  }

  async function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = e.target.files;
    if (!files || !activeConvId) return;
    if (sending || uploading) return;

    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    try {
      for (const file of list) {
        try {
          let result;
          if (file.type.startsWith("image/")) {
            result = await uploadFile(file);
          } else {
            result = await uploadAttachment(file);
          }
          await api<any>(`/chat/conversations/${activeConvId}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: result.url }),
          });
        } catch (err: any) {
          toast.error(err?.message || "Не удалось загрузить файл");
        }
      }
      await loadMessages(activeConvId);
      void loadConversations();
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function isImageUrl(url: string): boolean {
    return /^https?:\/\//.test(url) && /\.(png|jpe?g|webp|gif)$/i.test(url.split("?")[0]);
  }

  function isProbablyUrl(text: string): boolean {
    return /^https?:\/\//.test(text);
  }

  function triggerDownload(url: string, filename?: string): void {
    try {
      const a = document.createElement("a");
      a.href = url;
      if (filename) a.download = filename;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, "_blank", "noreferrer");
    }
  }

  function renderMarkdown(content: string) {
    let html = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    html = html.replace(
      /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="underline">$1</a>',
    );

    html = html.replace(/\n/g, "<br />");

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
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
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl w-full overflow-hidden">
      <div
        className={cn(
          "w-full border-r md:w-80 md:block",
          activeConvId ? "hidden md:block" : "block",
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="font-semibold">Диалоги</h2>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
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
                  "flex w-full items-center gap-3 border-b p-4 text-left transition-colors",
                  conv.id === BOT_CONVERSATION_ID
                    ? "bg-blue-50 text-blue-900 hover:bg-blue-100"
                    : "hover:bg-muted",
                  activeConvId === conv.id && conv.id !== BOT_CONVERSATION_ID && "bg-muted",
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {conv.participant.avatarUrl ? (
                    <AvatarImage src={conv.participant.avatarUrl} alt={conv.participant.name} />
                  ) : null}
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
        </div>
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

            <div ref={messagesViewportRef} className="flex-1 overflow-y-auto p-4">
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
                      {isImageUrl(msg.content) ? (
                        <button
                          type="button"
                          onClick={() => triggerDownload(msg.content)}
                          className="block cursor-pointer"
                        >
                          <img
                            src={msg.content}
                            alt="Вложенное изображение"
                            className="max-h-64 w-full max-w-xs cursor-pointer rounded-lg object-cover"
                          />
                        </button>
                      ) : isProbablyUrl(msg.content) ? (
                        <button
                          type="button"
                          onClick={() => triggerDownload(msg.content)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            msg.senderId === user?.id
                              ? "border border-primary/40 bg-primary/10 text-primary-foreground hover:bg-primary/20"
                              : "border border-muted-foreground/40 bg-background/20 text-muted-foreground hover:bg-background/40",
                          )}
                        >
                          Скачать вложение
                        </button>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {msg.senderId === BOT_SENDER_ID
                            ? renderMarkdown(msg.content)
                            : msg.content}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1 text-xs">
                        <span
                          className={cn(
                            msg.senderId === user?.id
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.senderId === user?.id && (
                          <span className="inline-flex items-center gap-0.5">
                            {msg.isRead ? (
                              <CheckCheck className="h-3 w-3 text-primary-foreground/80" />
                            ) : (
                              <Check className="h-3 w-3 text-primary-foreground/80" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {activeConvId === BOT_CONVERSATION_ID && botThinking && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl bg-muted px-4 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Ассистент думает</span>
                        <span className="flex gap-1">
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

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
                className="flex items-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachFiles}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeConvId || uploading}
                  title="Прикрепить файл"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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

