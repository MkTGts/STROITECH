"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

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

export default function ObjectDetailPage() {
  const { id } = useParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [object, setObject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
      <Link href="/objects">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К объектам
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold">{object.title}</h1>
          {(() => {
            const status = STATUS_CONFIG[object.status] || STATUS_CONFIG.active;
            return <Badge className={`mt-2 ${status.color}`}>{status.label}</Badge>;
          })()}

          {object.description && (
            <p className="mt-4 text-muted-foreground">{object.description}</p>
          )}

          <h2 className="mb-4 mt-8 text-xl font-semibold">Этапы строительства</h2>
          <div className="space-y-3">
            {object.stages?.map((stage: any) => {
              const Icon = STATUS_ICONS[stage.status] || AlertCircle;
              return (
                <Card key={stage.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        stage.status === "completed" ? "bg-green-100 text-green-700" :
                        stage.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{STAGE_LABELS[stage.stageType] || stage.stageType}</p>
                        <p className="text-xs text-muted-foreground">
                          {stage.status === "completed" ? "Завершён" : stage.status === "in_progress" ? "В процессе" : "Ожидание"}
                        </p>
                      </div>
                    </div>
                    {(stage.materialsRequest || stage.buildersRequest || stage.equipmentRequest) && (
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
