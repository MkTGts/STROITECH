"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Images,
  LayoutList,
  Loader2,
  LogIn,
  Newspaper,
  UsersRound,
  UserMinus,
  CalendarDays,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WallPostForm } from "@/components/features/wall-post-form";
import { FeedShareCard } from "@/components/features/feed-share-card";
import { FeedPlainSocialText, FeedTagChips } from "@/components/features/feed-social-body";
import { VerifiedBadge } from "@/components/features/verified-badge";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { canManageFeedPost } from "@/app/lenta/lenta-client";
import type {
  CommunityDetail,
  CommunityMemberRow,
  EventListItem,
  FeedPostListItem,
  PhotoAlbumListItem,
} from "shared";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  moderator: "Модератор",
  member: "Участник",
};

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function normalizeItem(p: FeedPostListItem): FeedPostListItem {
  return {
    ...p,
    kind: p.kind ?? "article",
    attachments: p.attachments ?? [],
    tags: p.tags ?? [],
    mentions: p.mentions ?? [],
    mentionUsers: p.mentionUsers ?? [],
    community: p.community,
  };
}

export default function CommunityDetailPage() {
  const { id } = useParams();
  const communityId = typeof id === "string" ? id : "";
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [wall, setWall] = useState<FeedPostListItem[]>([]);
  const [articles, setArticles] = useState<FeedPostListItem[]>([]);
  const [members, setMembers] = useState<CommunityMemberRow[]>([]);
  const [albums, setAlbums] = useState<PhotoAlbumListItem[]>([]);
  const [communityEvents, setCommunityEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const isCommunityStaff =
    user?.role === "moderator" ||
    detail?.myRole === "admin" ||
    detail?.myRole === "moderator";

  const loadDetail = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: CommunityDetail }>(`/communities/${communityId}`);
    setDetail(res.data);
  }, [communityId]);

  const loadWall = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
      params: { communityId, kind: "wall", limit: 30, page: 1 },
    });
    setWall(res.data.items.map(normalizeItem));
  }, [communityId]);

  const loadArticles = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
      params: { communityId, kind: "article", limit: 24, page: 1 },
    });
    setArticles(res.data.items.map(normalizeItem));
  }, [communityId]);

  const loadMembers = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: { items: CommunityMemberRow[] } }>(
      `/communities/${communityId}/members`,
      { params: { limit: 100, page: 1 } },
    );
    setMembers(res.data.items);
  }, [communityId]);

  const loadAlbums = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: { items: PhotoAlbumListItem[] } }>(
      `/communities/${communityId}/albums`,
      { params: { limit: 24, page: 1 } },
    );
    setAlbums(res.data.items);
  }, [communityId]);

  const loadCommunityEvents = useCallback(async () => {
    if (!communityId) return;
    const res = await api<{ success: boolean; data: { items: EventListItem[] } }>("/events", {
      params: { communityId, when: "upcoming", limit: 30, page: 1 },
    });
    setCommunityEvents(res.data.items);
  }, [communityId]);

  const refreshAll = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      await Promise.all([
        loadDetail(),
        loadWall(),
        loadArticles(),
        loadMembers(),
        loadAlbums(),
        loadCommunityEvents(),
      ]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ошибка загрузки");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [communityId, loadDetail, loadWall, loadArticles, loadMembers, loadAlbums, loadCommunityEvents]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  async function joinLeave(joining: boolean) {
    if (!isAuthenticated || !communityId) return;
    try {
      await api(`/communities/${communityId}/${joining ? "join" : "leave"}`, { method: "POST" });
      toast.success(joining ? "Вы вступили в сообщество" : "Вы вышли из сообщества");
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось выполнить действие");
    }
  }

  async function kickMember(targetUserId: string) {
    if (!communityId) return;
    try {
      await api(`/communities/${communityId}/members/${targetUserId}`, { method: "DELETE" });
      toast.success("Участник исключён");
      await loadMembers();
      await loadDetail();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось исключить");
    }
  }

  async function setMemberRole(targetUserId: string, role: "moderator" | "member") {
    if (!communityId) return;
    try {
      await api(`/communities/${communityId}/members/${targetUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast.success("Роль обновлена");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось сменить роль");
    }
  }

  async function createAlbum() {
    const t = newAlbumTitle.trim();
    if (!t || !communityId) return;
    setCreatingAlbum(true);
    try {
      const res = await api<{ success: boolean; data: { id: string } }>("/albums", {
        method: "POST",
        body: JSON.stringify({ title: t, communityId }),
      });
      setAlbumDialogOpen(false);
      setNewAlbumTitle("");
      await loadAlbums();
      window.location.href = `/albums/${res.data.id}`;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось создать альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  if (!communityId) return null;

  if (loading && !detail) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-muted-foreground">
        Сообщество не найдено.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/communities">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Все сообщества
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{detail.title}</h1>
        {detail.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{detail.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {detail.region ? <span>Регион: {detail.region}</span> : null}
          <span>{detail.memberCount} участников</span>
          <span>{detail.postCount} публикаций</span>
          <span>{detail.albumCount} альбомов</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isLoading && !isAuthenticated && (
            <Button asChild>
              <Link href="/auth/login">
                <LogIn className="mr-2 h-4 w-4" />
                Войти, чтобы вступить
              </Link>
            </Button>
          )}
          {isAuthenticated && !detail.myRole && (
            <Button onClick={() => void joinLeave(true)}>Вступить</Button>
          )}
          {isAuthenticated && detail.myRole && (
            <Button variant="outline" onClick={() => void joinLeave(false)}>
              Покинуть
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-1">
          <TabsTrigger value="feed" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Лента
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <UsersRound className="h-4 w-4" />
            Участники
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-2">
            <Images className="h-4 w-4" />
            Альбомы
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            События
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {detail.myRole && (
            <WallPostForm mode="create" communityId={communityId} onPosted={() => void loadWall()} />
          )}
          {!detail.myRole && (
            <p className="text-sm text-muted-foreground">Вступите в сообщество, чтобы публиковать записи.</p>
          )}
          <Tabs defaultValue="wall">
            <TabsList className="mb-3">
              <TabsTrigger value="wall" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Стена
              </TabsTrigger>
              <TabsTrigger value="articles" className="gap-2">
                <Newspaper className="h-4 w-4" />
                Статьи
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wall" className="space-y-4">
              {wall.length === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Записей на стене пока нет.
                </p>
              ) : (
                <ul className="space-y-4">
                  {wall.map((post) => (
                    <li key={post.id}>
                      <Card>
                        <CardContent className="p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <Link href={`/profiles/${post.author.id}`} className="font-medium text-foreground hover:underline">
                              {post.author.name}
                            </Link>
                            <time dateTime={post.publishedAt}>{formatShortDate(post.publishedAt)}</time>
                          </div>
                          {post.kind === "share" && post.sharePreview ? (
                            <>
                              {(post.body ?? "").trim() ? (
                                <FeedPlainSocialText
                                  text={post.body ?? ""}
                                  mentionUsers={post.mentionUsers ?? []}
                                  className="mb-3 whitespace-pre-wrap text-sm text-foreground"
                                />
                              ) : null}
                              <FeedTagChips tags={post.tags ?? []} className="mb-2" />
                              <FeedShareCard preview={post.sharePreview} />
                            </>
                          ) : (
                            <>
                              {post.title?.trim() && post.title.trim() !== " " ? (
                                <Link href={`/lenta/${post.id}`} className="font-semibold hover:text-primary">
                                  {post.title}
                                </Link>
                              ) : null}
                              <div className="mt-2 text-sm">
                                <FeedPlainSocialText text={post.body ?? ""} mentionUsers={post.mentionUsers} />
                              </div>
                              <FeedTagChips tags={post.tags ?? []} />
                              {post.attachments?.length ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {post.attachments.map((url) => (
                                    <Link key={url} href={`/lenta/${post.id}`}>
                                      <img src={url} alt="" className="h-28 w-full rounded-md object-cover" />
                                    </Link>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          )}
                          {canManageFeedPost(post, user ?? undefined, {
                            communityStaff: Boolean(isCommunityStaff),
                            communityId,
                          }) && (
                            <div className="mt-3 border-t pt-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/lenta/${post.id}/edit`}>Редактировать</Link>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="articles" className="space-y-3">
              {articles.length === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Статей пока нет.
                </p>
              ) : (
                <ul className="space-y-3">
                  {articles.map((post) => (
                    <li key={post.id}>
                      <Link href={`/lenta/${post.id}`}>
                        <Card className="transition-colors hover:bg-muted/40">
                          <CardContent className="p-4">
                            <h3 className="font-semibold">{post.title}</h3>
                            {post.excerpt ? (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                            ) : null}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {post.author.name} · {formatShortDate(post.publishedAt)}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="members">
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <Link href={`/profiles/${m.user.id}`}>
                      <Avatar className="h-10 w-10">
                        {m.user.avatarUrl ? <AvatarImage src={m.user.avatarUrl} alt="" /> : null}
                        <AvatarFallback>{m.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/profiles/${m.user.id}`} className="font-medium hover:text-primary">
                          {m.user.name}
                        </Link>
                        {m.user.isVerified ? <VerifiedBadge compact /> : null}
                        <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                      </div>
                      {m.user.companyName ? (
                        <p className="text-xs text-muted-foreground">{m.user.companyName}</p>
                      ) : null}
                    </div>
                    {detail.myRole === "admin" && m.role !== "admin" && m.user.id !== user?.id && (
                      <div className="flex flex-wrap items-center gap-2">
                        {m.role === "member" && (
                          <Button type="button" variant="outline" size="sm" onClick={() => void setMemberRole(m.user.id, "moderator")}>
                            Сделать модератором
                          </Button>
                        )}
                        {m.role === "moderator" && (
                          <Button type="button" variant="outline" size="sm" onClick={() => void setMemberRole(m.user.id, "member")}>
                            Снять модератора
                          </Button>
                        )}
                      </div>
                    )}
                    {isCommunityStaff && m.user.id !== user?.id && !(m.user.id === detail.creatorId && user?.role !== "moderator") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        title="Исключить"
                        onClick={() => void kickMember(m.user.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="albums" className="space-y-4">
          {detail.myRole && (
            <Button size="sm" onClick={() => setAlbumDialogOpen(true)}>
              Новый альбом
            </Button>
          )}
          {albums.length === 0 ? (
            <p className="text-sm text-muted-foreground">Альбомов пока нет.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {albums.map((a) => (
                <Link key={a.id} href={`/albums/${a.id}`}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    <div className="aspect-[16/9] bg-muted">
                      {a.coverUrl ? (
                        <img src={a.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.photoCount} фото</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {detail.myRole && (
            <Button size="sm" asChild className="gap-2">
              <Link href={`/events/new?communityId=${communityId}`}>
                <Plus className="h-4 w-4" />
                Событие в сообществе
              </Link>
            </Button>
          )}
          {communityEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Предстоящих событий нет.</p>
          ) : (
            <ul className="space-y-3">
              {communityEvents.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/events/${ev.id}`}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <p className="font-medium">{ev.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(ev.startsAt).toLocaleString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {ev.isOnline ? " · онлайн" : ev.venue ? ` · ${ev.venue}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/events?communityId=${communityId}`}
            className="inline-block text-sm text-primary hover:underline"
          >
            Все события этого сообщества
          </Link>
        </TabsContent>
      </Tabs>

      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый альбом в сообществе</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="alb-title">Название</Label>
            <Input id="alb-title" value={newAlbumTitle} onChange={(e) => setNewAlbumTitle(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumDialogOpen(false)}>
              Отмена
            </Button>
            <Button disabled={creatingAlbum} onClick={() => void createAlbum()}>
              {creatingAlbum ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
