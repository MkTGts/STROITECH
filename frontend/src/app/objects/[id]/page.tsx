"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Check, Clock, AlertCircle, MapPin, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, string> = {
  realty: "Поиск недвижимости",
  project: "Проект",
  foundation: "Фундамент",
  walls: "Стены и перекрытия",
  roof: "Кровля",
  engineering: "Инженерные сети",
  finish: "Отделочные работы",
  furniture: "Мебель и интерьер",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
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

  const fetchObject = () =>
    api<any>(`/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => {});

  useEffect(() => {
    setLoading(true);
    fetchObject().finally(() => setLoading(false));
  }, [id]);

  const isOwner = isAuthenticated && user?.id === object?.userId;

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
        {isAuthenticated && user?.id === object.userId && (
          <Link href={`/objects/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" /> Редактировать
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold">{object.title}</h1>
          {(() => {
            const status = STATUS_CONFIG[object.status] || STATUS_CONFIG.active;
            return <Badge className={`mt-2 ${status.color}`}>{status.label}</Badge>;
          })()}

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
                      {isOwner && !isEditing && (
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
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {object.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{object.user.companyName || object.user.name}</p>
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
    </div>
  );
}
