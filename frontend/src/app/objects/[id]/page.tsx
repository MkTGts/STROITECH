"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Check, Clock, AlertCircle, MapPin, Pencil, Save, X, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "sonner";
import { ShareToWallButton } from "@/components/features/share-to-wall-button";

const STAGE_LABELS: Record<string, string> = {
  foundation: "Фундамент",
  walls: "Стены и перекрытия",
  roof: "Кровля",
  engineering: "Инженерные сети",
  finish: "Отделочные работы",
  furniture: "Мебель и интерьер",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  active: { label: "Активный", color: "bg-green-100 text-green-700" },
  completed: { label: "Завершён", color: "bg-blue-100 text-blue-700" },
  archived: { label: "Архив", color: "bg-gray-100 text-gray-700" },
};

const STATUS_ICONS: Record<string, typeof Check> = {
  completed: Check,
  in_progress: Clock,
  pending: AlertCircle,
};

const STAGE_STATUS_OPTIONS = [
  { value: "pending", label: "Ожидание" },
  { value: "in_progress", label: "В процессе" },
  { value: "completed", label: "Завершён" },
];

export default function ObjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [object, setObject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    status: "pending",
    materialsRequest: "",
    buildersRequest: "",
    equipmentRequest: "",
  });
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
  const [addStageForm, setAddStageForm] = useState({
    stageType: "",
    materialsRequest: "",
    buildersRequest: "",
    equipmentRequest: "",
  });
  const [addingStage, setAddingStage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchObject = () =>
    api<any>(`/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => {});

  useEffect(() => {
    setLoading(true);
    fetchObject().finally(() => setLoading(false));
  }, [id]);

  const hasAccessToken = _hasAccessToken();
  const roleFromToken = hasAccessToken ? _getRoleFromAccessToken() : null;
  const isModerator = user?.role === "moderator" || roleFromToken === "moderator";
  const isOwner = user?.id != null && user.id === object?.userId;
  const canManageObject = (hasAccessToken || isAuthenticated) && (isModerator || isOwner);

  function startEditStage(stage: any) {
    setEditingStageId(stage.id);
    setStageForm({
      status: stage.status || "pending",
      materialsRequest: stage.materialsRequest ?? "",
      buildersRequest: stage.buildersRequest ?? "",
      equipmentRequest: stage.equipmentRequest ?? "",
    });
  }

  function cancelEditStage() {
    setEditingStageId(null);
  }

  async function saveStage(stageId: string) {
    setSavingStageId(stageId);
    try {
      await api(`/objects/${id}/stages/${stageId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: stageForm.status,
          materialsRequest: stageForm.materialsRequest || null,
          buildersRequest: stageForm.buildersRequest || null,
          equipmentRequest: stageForm.equipmentRequest || null,
        }),
      });
      toast.success("Этап обновлён");
      setEditingStageId(null);
      fetchObject();
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setSavingStageId(null);
    }
  }

  async function handleCompleteObject() {
    setCompleting(true);
    try {
      await api(`/objects/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "completed" }),
      });
      toast.success("Объект завершён");
      setCompleteDialogOpen(false);
      fetchObject();
    } catch (err: any) {
      toast.error(err.message || "Ошибка");
    } finally {
      setCompleting(false);
    }
  }

  const canAddStage = canManageObject && (object?.status === "draft" || object?.status === "active");
  const existingStageTypes = object?.stages?.map((s: any) => s.stageType) ?? [];
  const availableStageTypes = Object.keys(STAGE_LABELS).filter((t) => !existingStageTypes.includes(t));

  function openAddStageDialog() {
    setAddStageForm({
      stageType: availableStageTypes[0] ?? "",
      materialsRequest: "",
      buildersRequest: "",
      equipmentRequest: "",
    });
    setAddStageDialogOpen(true);
  }

  async function handleAddStage() {
    if (!addStageForm.stageType) {
      toast.error("Выберите тип этапа");
      return;
    }
    setAddingStage(true);
    try {
      await api(`/objects/${id}/stages`, {
        method: "POST",
        body: JSON.stringify({
          stageType: addStageForm.stageType,
          materialsRequest: addStageForm.materialsRequest || undefined,
          buildersRequest: addStageForm.buildersRequest || undefined,
          equipmentRequest: addStageForm.equipmentRequest || undefined,
        }),
      });
      toast.success("Этап добавлен");
      setAddStageDialogOpen(false);
      fetchObject();
    } catch (err: any) {
      toast.error(err.message || "Ошибка добавления этапа");
    } finally {
      setAddingStage(false);
    }
  }

  async function handleDeleteObject() {
    setDeleting(true);
    try {
      await api(`/objects/${id}`, { method: "DELETE" });
      toast.success("Объект удалён");
      setDeleteDialogOpen(false);
      router.push("/objects");
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!object) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Объект не найден</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/objects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> К объектам
          </Button>
        </Link>
        {canManageObject && (
          <div className="flex flex-wrap items-center gap-2">
            {object.status === "draft" && (
              <Link href={`/objects/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Pencil className="h-4 w-4" /> Продолжить создание
                </Button>
              </Link>
            )}
            {object.status === "active" && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setCompleteDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4" /> Завершить объект
              </Button>
            )}
            {object.status !== "completed" && (
              <Link href={`/objects/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Pencil className="h-4 w-4" /> Редактировать
                </Button>
              </Link>
            )}
            {(isModerator || object.status === "draft") && (
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" /> Удалить объект
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">{object.title}</h1>
            {isAuthenticated &&
              typeof id === "string" &&
              object.status !== "draft" &&
              object.status !== "archived" && (
                <ShareToWallButton targetType="construction_object" targetId={id} />
              )}
          </div>
          {(() => {
            const status = STATUS_CONFIG[object.status] || STATUS_CONFIG.active;
            return <Badge className={`mt-2 ${status.color}`}>{status.label}</Badge>;
          })()}

          {object.createdAt && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Создан{" "}
              {new Date(object.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {object.region && (
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> Регион: {object.region}
            </p>
          )}

          {object.description && (
            <p className="mt-4 text-muted-foreground">{object.description}</p>
          )}

          <h2 className="mb-4 mt-8 text-xl font-semibold">Этапы строительства</h2>
          <div className="space-y-3">
            {canAddStage && availableStageTypes.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={openAddStageDialog}
              >
                <Plus className="h-4 w-4" /> Добавить этап
              </Button>
            )}
            {object.stages?.map((stage: any) => {
              const Icon = STATUS_ICONS[stage.status] || AlertCircle;
              const isEditing = editingStageId === stage.id;
              const isSaving = savingStageId === stage.id;

              return (
                <Card key={stage.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          stage.status === "completed" ? "bg-green-100 text-green-700" :
                          stage.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{STAGE_LABELS[stage.stageType] || stage.stageType}</p>
                          {!isEditing && (
                            <p className="text-xs text-muted-foreground">
                              {stage.status === "completed" ? "Завершён" : stage.status === "in_progress" ? "В процессе" : "Ожидание"}
                            </p>
                          )}
                        </div>
                      </div>
                      {canManageObject && object.status !== "completed" && !isEditing && (
                        <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={() => startEditStage(stage)}>
                          <Pencil className="h-3.5 w-3.5" /> Редактировать этап
                        </Button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <div>
                          <Label className="text-xs">Статус этапа</Label>
                          <Select value={stageForm.status} onValueChange={(v) => setStageForm((p) => ({ ...p, status: v }))}>
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGE_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Запрос на материалы</Label>
                          <Textarea
                            placeholder="Какие материалы нужны?"
                            value={stageForm.materialsRequest}
                            onChange={(e) => setStageForm((p) => ({ ...p, materialsRequest: e.target.value }))}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Запрос на строителей</Label>
                          <Textarea
                            placeholder="Какие работы нужно выполнить?"
                            value={stageForm.buildersRequest}
                            onChange={(e) => setStageForm((p) => ({ ...p, buildersRequest: e.target.value }))}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Запрос на технику</Label>
                          <Textarea
                            placeholder="Какая техника нужна?"
                            value={stageForm.equipmentRequest}
                            onChange={(e) => setStageForm((p) => ({ ...p, equipmentRequest: e.target.value }))}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={() => saveStage(stage.id)} disabled={isSaving}>
                            {isSaving ? "Сохранение..." : "Сохранить"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditStage} disabled={isSaving}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      (stage.materialsRequest || stage.buildersRequest || stage.equipmentRequest) && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          {stage.materialsRequest && (
                            <div><span className="text-xs font-medium text-muted-foreground">Материалы:</span><p className="text-sm">{stage.materialsRequest}</p></div>
                          )}
                          {stage.buildersRequest && (
                            <div><span className="text-xs font-medium text-muted-foreground">Строители:</span><p className="text-sm">{stage.buildersRequest}</p></div>
                          )}
                          {stage.equipmentRequest && (
                            <div><span className="text-xs font-medium text-muted-foreground">Техника:</span><p className="text-sm">{stage.equipmentRequest}</p></div>
                          )}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          {object.user && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {object.user.avatarUrl ? (
                      <AvatarImage src={object.user.avatarUrl} alt={object.user.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {object.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{object.user.name}</p>
                  </div>
                </div>
                {isAuthenticated && (
                  <Link href={`/chat?to=${object.user.id}&context=object&contextId=${object.id}`}>
                    <Button className="mt-4 w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Написать
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Завершить объект?</DialogTitle>
            <DialogDescription>
              После завершения объект получит статус «Завершён» и <strong>вернуть его обратно в активные будет нельзя</strong>.
              Убедитесь, что все этапы отражены корректно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} disabled={completing}>
              Отмена
            </Button>
            <Button onClick={handleCompleteObject} disabled={completing}>
              {completing ? "Сохранение..." : "Да, завершить объект"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Удалить объект?</DialogTitle>
            <DialogDescription>
              Объект «{object.title}» и все его этапы будут удалены безвозвратно. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteObject} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить объект"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addStageDialogOpen} onOpenChange={setAddStageDialogOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Добавить этап строительства</DialogTitle>
            <DialogDescription>
              Выберите тип этапа и при необходимости укажите запросы на материалы, строителей или технику.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-sm">Тип этапа</Label>
              <Select
                value={addStageForm.stageType}
                onValueChange={(v) => setAddStageForm((p) => ({ ...p, stageType: v }))}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Выберите этап" />
                </SelectTrigger>
                <SelectContent>
                  {availableStageTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {STAGE_LABELS[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Запрос на материалы (опционально)</Label>
              <Textarea
                placeholder="Какие материалы нужны?"
                value={addStageForm.materialsRequest}
                onChange={(e) => setAddStageForm((p) => ({ ...p, materialsRequest: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Запрос на строителей (опционально)</Label>
              <Textarea
                placeholder="Какие работы нужно выполнить?"
                value={addStageForm.buildersRequest}
                onChange={(e) => setAddStageForm((p) => ({ ...p, buildersRequest: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Запрос на технику (опционально)</Label>
              <Textarea
                placeholder="Какая техника нужна?"
                value={addStageForm.equipmentRequest}
                onChange={(e) => setAddStageForm((p) => ({ ...p, equipmentRequest: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddStageDialogOpen(false)} disabled={addingStage}>
              Отмена
            </Button>
            <Button onClick={handleAddStage} disabled={addingStage || !addStageForm.stageType}>
              {addingStage ? "Добавление..." : "Добавить этап"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function _getRoleFromAccessToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem("accessToken");
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "===".slice((payload.length + 3) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json);
    return typeof parsed?.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function _hasAccessToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("accessToken"));
}
