"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Newspaper,
  Phone,
  Mail,
  Pencil,
  LayoutList,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingCard } from "@/components/features/listing-card";
import { FollowButton } from "@/components/features/follow-button";
import { WallPostForm } from "@/components/features/wall-post-form";
import { FeedShareCard } from "@/components/features/feed-share-card";
import { FeedPlainSocialText, FeedTagChips } from "@/components/features/feed-social-body";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { FeedPostListItem, PhotoAlbumDetail, PhotoAlbumListItem } from "shared";
import { RUSSIAN_REGIONS } from "@/constants/regions";
import { toast } from "sonner";

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

function normalizeFeedPostItem(p: FeedPostListItem): FeedPostListItem {
  return {
    ...p,
    kind: p.kind ?? "article",
    attachments: p.attachments ?? [],
    sharePreview: p.sharePreview,
    shareTarget: p.shareTarget,
    shareTargetId: p.shareTargetId,
    tags: p.tags ?? [],
    mentions: p.mentions ?? [],
    mentionUsers: p.mentionUsers ?? [],
  };
}

export default function ProfileDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wallPosts, setWallPosts] = useState<FeedPostListItem[]>([]);
  const [articlePosts, setArticlePosts] = useState<FeedPostListItem[]>([]);
  const [albums, setAlbums] = useState<PhotoAlbumListItem[]>([]);
  const [feedPostsLoading, setFeedPostsLoading] = useState(true);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    region: "",
    companyName: "",
    description: "",
  });

  async function refreshProfile(): Promise<void> {
    if (!id || typeof id !== "string") return;
    try {
      const res = await api<any>(`/users/${id}`);
      setProfile(res.data);
      setForm({
        name: res.data?.name || "",
        email: res.data?.email || "",
        phone: res.data?.phone || "",
        region: res.data?.region || "",
        companyName: res.data?.companyName || "",
        description: res.data?.description || "",
      });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    let cancelled = false;
    setLoading(true);
    setFeedPostsLoading(true);

    api<any>(`/users/${id}`)
      .then((res) => {
        if (!cancelled) {
          setProfile(res.data);
          setForm({
            name: res.data?.name || "",
            email: res.data?.email || "",
            phone: res.data?.phone || "",
            region: res.data?.region || "",
            companyName: res.data?.companyName || "",
            description: res.data?.description || "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    Promise.all([
      api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
        params: { authorId: id, kind: "wall", limit: 50, page: 1 },
      }),
      api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
        params: { authorId: id, kind: "article", limit: 50, page: 1 },
      }),
      api<{ success: boolean; data: { items: PhotoAlbumListItem[] } }>(`/users/${id}/albums`, {
        params: { page: 1, limit: 50 },
      }),
    ])
      .then(([wallRes, articleRes, albumsRes]) => {
        if (!cancelled) {
          setWallPosts((wallRes.data?.items ?? []).map(normalizeFeedPostItem));
          setArticlePosts((articleRes.data?.items ?? []).map(normalizeFeedPostItem));
          setAlbums(albumsRes.data?.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWallPosts([]);
          setArticlePosts([]);
          setAlbums([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFeedPostsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Профиль не найден</p>
      </div>
    );
  }

  const isOwnProfile = isAuthenticated && user?.id === profile.id;

  async function refetchWallPosts(): Promise<void> {
    if (!id || typeof id !== "string") return;
    try {
      const res = await api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
        params: { authorId: id, kind: "wall", limit: 50, page: 1 },
      });
      setWallPosts((res.data?.items ?? []).map(normalizeFeedPostItem));
    } catch {
      /* ignore */
    }
  }

  async function refetchAlbums(): Promise<void> {
    if (!id || typeof id !== "string") return;
    try {
      const res = await api<{ success: boolean; data: { items: PhotoAlbumListItem[] } }>(`/users/${id}/albums`, {
        params: { page: 1, limit: 50 },
      });
      setAlbums(res.data?.items ?? []);
    } catch {
      /* ignore */
    }
  }

  async function handleCreateAlbum(): Promise<void> {
    const t = newAlbumTitle.trim();
    if (!t) {
      toast.error("Укажите название альбома");
      return;
    }
    setCreatingAlbum(true);
    try {
      const res = await api<{ success: boolean; data: PhotoAlbumDetail }>("/albums", {
        method: "POST",
        body: JSON.stringify({ title: t }),
      });
      setCreateAlbumOpen(false);
      setNewAlbumTitle("");
      await refetchAlbums();
      router.push(`/albums/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Не удалось создать альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  const isModerator = isAuthenticated && user?.role === "moderator";

  async function handleSaveProfile(): Promise<void> {
    if (!id || typeof id !== "string") return;
    if (!form.name.trim()) {
      toast.error("Укажите имя участника");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Укажите email участника");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Укажите номер телефона участника");
      return;
    }

    setSaving(true);
    try {
      const res = await api<any>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          region: form.region.trim() ? form.region.trim() : null,
          companyName: form.companyName.trim() ? form.companyName.trim() : null,
          description: form.description.trim() ? form.description.trim() : null,
        }),
      });
      setProfile(res.data);
      setEditMode(false);
      toast.success("Профиль участника обновлён");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось обновить профиль участника");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/profiles">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К участникам
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <Avatar className="h-24 w-24 shrink-0">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-3xl text-primary">
                {profile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
                {profile.isVerified && <Badge className="bg-green-500 text-white">Проверен</Badge>}
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <Link href={`/profiles/${profile.id}/followers`} className="hover:text-foreground hover:underline">
                    Подписчики: {profile.followerCount ?? 0}
                  </Link>
                  <Link href={`/profiles/${profile.id}/following`} className="hover:text-foreground hover:underline">
                    Подписки: {profile.followingCount ?? 0}
                  </Link>
                </span>
                {isModerator && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setEditMode((prev) => !prev)}
                  >
                    <Pencil className="h-4 w-4" />
                    {editMode ? "Отмена" : "Редактировать профиль"}
                  </Button>
                )}
              </div>
              {editMode && isModerator ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Имя</Label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Телефон</Label>
                    <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Регион</Label>
                    <Select value={form.region || "__none__"} onValueChange={(value) => setForm((p) => ({ ...p, region: value === "__none__" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите регион" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
                        <SelectItem value="__none__">Не указан</SelectItem>
                        {RUSSIAN_REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Компания</Label>
                    <Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Описание</Label>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="button" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {profile.companyName && (
                    <p className="mt-1 text-muted-foreground">{profile.companyName}</p>
                  )}
                  {profile.region && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Регион: {profile.region}
                    </p>
                  )}
                  {isAuthenticated && (profile.phone || profile.email) && (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {profile.phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-4 w-4" /> {profile.phone}
                        </p>
                      )}
                      {profile.email && (
                        <p className="flex items-center gap-1">
                          <Mail className="h-4 w-4" /> {profile.email}
                        </p>
                      )}
                    </div>
                  )}
                  {profile.description && (
                    <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{profile.description}</p>
                  )}
                </>
              )}

              {isAuthenticated && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <FollowButton targetUserId={profile.id} onFollowChange={() => void refreshProfile()} />
                  <Link href={`/chat?to=${profile.id}&context=profile`}>
                    <Button className="gap-2">
                      <MessageCircle className="h-4 w-4" /> Написать
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {isAuthenticated && profile.managers?.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-3 font-semibold">Менеджеры</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.managers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        {m.position && <p className="text-sm text-muted-foreground">{m.position}</p>}
                        <p className="mt-1 flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {m.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {profile.listings?.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Объявления</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={{ ...listing, user: profile }} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">Лента</h2>
        {feedPostsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="wall" className="w-full">
            <TabsList className="mb-4 flex flex-wrap gap-1">
              <TabsTrigger value="wall" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Стена
              </TabsTrigger>
              <TabsTrigger value="articles" className="gap-2">
                <Newspaper className="h-4 w-4" />
                Статьи
              </TabsTrigger>
              <TabsTrigger value="albums" className="gap-2">
                <Images className="h-4 w-4" />
                Альбомы
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wall" className="mt-0 space-y-4">
              {isOwnProfile && <WallPostForm mode="create" onPosted={() => void refetchWallPosts()} />}
              {wallPosts.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/80 px-6 py-8 text-center text-sm text-muted-foreground">
                  На стене пока нет записей.
                </p>
              ) : (
                <ul className="space-y-4">
                  {wallPosts.map((post) => (
                    <li key={post.id}>
                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <time dateTime={post.publishedAt}>{formatShortDate(post.publishedAt)}</time>
                            <Link href={`/lenta/${post.id}`} className="font-medium text-primary hover:underline">
                              Открыть и комментировать
                            </Link>
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
                              <FeedTagChips tags={post.tags ?? []} className="mb-2" />
                              <div className="line-clamp-4 text-sm text-foreground">
                                <FeedPlainSocialText
                                  text={post.body ?? ""}
                                  mentionUsers={post.mentionUsers ?? []}
                                  className="whitespace-pre-wrap"
                                />
                              </div>
                              {(post.attachments?.length ?? 0) > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                  {post.attachments!.slice(0, 6).map((url) => (
                                    <Link key={url} href={`/lenta/${post.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-md border">
                                      <img src={url} alt="" className="h-full w-full object-cover" />
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="articles" className="mt-0">
              {articlePosts.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/80 px-6 py-8 text-center text-sm text-muted-foreground">
                  У этого участника пока нет опубликованных статей.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {articlePosts.map((post) => (
                    <Card key={post.id} className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
                      <Link href={`/lenta/${post.id}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
                        {post.coverImageUrl ? (
                          <img
                            src={post.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Newspaper className="h-12 w-12 opacity-35" aria-hidden />
                          </div>
                        )}
                      </Link>
                      <CardContent className="flex flex-1 flex-col gap-2 p-4">
                        <Link href={`/lenta/${post.id}`}>
                          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
                            {post.title}
                          </h3>
                        </Link>
                        {post.excerpt ? (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                        ) : null}
                        <FeedTagChips tags={post.tags ?? []} />
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                          <Link
                            href={`/lenta/${post.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Читать
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                          <time className="text-xs text-muted-foreground" dateTime={post.publishedAt}>
                            {formatShortDate(post.publishedAt)}
                          </time>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="albums" className="mt-0 space-y-4">
              {isOwnProfile && isAuthenticated && (
                <div className="flex justify-end">
                  <Button type="button" size="sm" className="gap-2" onClick={() => setCreateAlbumOpen(true)}>
                    <Images className="h-4 w-4" />
                    Новый альбом
                  </Button>
                </div>
              )}
              {albums.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/80 px-6 py-8 text-center text-sm text-muted-foreground">
                  Пока нет фотоальбомов.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {albums.map((album) => (
                    <Link key={album.id} href={`/albums/${album.id}`}>
                      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                        <div className="relative aspect-[16/10] bg-muted">
                          {album.coverUrl ? (
                            <img src={album.coverUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              <Images className="h-12 w-12 opacity-35" aria-hidden />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground">{album.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{album.photoCount} фото</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={createAlbumOpen} onOpenChange={setCreateAlbumOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Новый альбом</DialogTitle>
            <DialogDescription>Название можно изменить позже на странице альбома.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-album-title">Название</Label>
            <Input
              id="new-album-title"
              value={newAlbumTitle}
              onChange={(e) => setNewAlbumTitle(e.target.value)}
              maxLength={200}
              placeholder="Например, Портфолио 2025"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateAlbumOpen(false)}>
              Отмена
            </Button>
            <Button type="button" disabled={creatingAlbum} onClick={() => void handleCreateAlbum()}>
              {creatingAlbum ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
