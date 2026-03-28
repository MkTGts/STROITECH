"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  FileText,
  Hammer,
  Layers,
  Building2,
  Wrench,
  PaintBucket,
  Sofa,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelect } from "@/components/ui/region-select";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STAGES = [
  { type: "foundation", label: "Фундамент", icon: Layers, description: "Устройство фундамента" },
  { type: "walls", label: "Стены и перекрытия", icon: Building2, description: "Кладка стен, монтаж перекрытий" },
  { type: "roof", label: "Кровля", icon: Building2, description: "Стропильная система, покрытие" },
  { type: "engineering", label: "Инженерные сети", icon: Wrench, description: "Электрика, сантехника, отопление, вентиляция" },
  { type: "finish", label: "Отделочные работы", icon: PaintBucket, description: "Черновая и чистовая отделка" },
  { type: "furniture", label: "Мебель и интерьер", icon: Sofa, description: "Мебель, декор, техника" },
];

type StageForm = {
  stageType: string;
  materialsRequest: string;
  buildersRequest: string;
  equipmentRequest: string;
  enabled: boolean;
};

export default function CreateObjectPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [stages, setStages] = useState<StageForm[]>(
    STAGES.map((s) => ({ stageType: s.type, materialsRequest: "", buildersRequest: "", equipmentRequest: "", enabled: false })),
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  function toggleStage(index: number) {
    setStages((prev) => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s));
  }

  function updateStage(index: number, field: string, value: string) {
    setStages((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleSaveDraft() {
    if (!title.trim()) {
      toast.error("Введите название объекта");
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ data: { id: string } }>("/objects", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description || undefined,
          region: region || undefined,
          stages: [],
          isDraft: true,
        }),
      });
      toast.success("Черновик сохранён. Продолжите создание в карточке объекта.");
      router.push(`/objects/${res.data.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения черновика");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const enabledStages = stages.filter((s) => s.enabled);
    if (enabledStages.length === 0) {
      toast.error("Выберите хотя бы один этап");
      return;
    }

    setLoading(true);
    try {
      await api("/objects", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          region: region || undefined,
          stages: enabledStages.map((s) => ({
            stageType: s.stageType,
            materialsRequest: s.materialsRequest || undefined,
            buildersRequest: s.buildersRequest || undefined,
            equipmentRequest: s.equipmentRequest || undefined,
          })),
        }),
      });
      toast.success("Объект создан! Уведомления отправлены исполнителям.");
      router.push("/objects");
    } catch (err: any) {
      toast.error(err.message || "Ошибка создания объекта");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/objects">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К объектам
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Создать объект</CardTitle>
          <p className="text-sm text-muted-foreground">
            Без разницы — строительная компания вы или строите себе дом.
            Добавьте свой объект поэтапно: от участка до мебели.
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Название объекта</Label>
                <Input
                  placeholder="Например: Строительство дома в Подмосковье"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Описание (опционально)</Label>
                <Textarea
                  placeholder="Подробности о проекте..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <RegionSelect
                label="Регион"
                value={region}
                onValueChange={setRegion}
                optional
                placeholder="Не обязательно для черновика"
              />
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!title.trim()}
                >
                  Далее — выбрать этапы <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!title.trim() || loading}
                  onClick={handleSaveDraft}
                >
                  {loading ? "Сохранение..." : "Сохранить черновик"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Выберите этапы строительства. Для каждого этапа можно указать запрос на материалы, строителей и технику.
                Исполнителям придёт уведомление.
              </p>
              <div className="space-y-3">
                {stages.map((stage, i) => {
                  const meta = STAGES[i];
                  return (
                    <div key={stage.stageType} className={`rounded-xl border-2 p-4 transition-colors ${stage.enabled ? "border-primary bg-primary/5" : "border-border"}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 text-left"
                        onClick={() => toggleStage(i)}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stage.enabled ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          {stage.enabled ? <Check className="h-5 w-5" /> : <meta.icon className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{meta.label}</p>
                          <p className="text-sm text-muted-foreground">{meta.description}</p>
                        </div>
                      </button>

                      {stage.enabled && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <div>
                            <Label className="text-xs">Запрос на материалы</Label>
                            <Textarea
                              placeholder="Какие материалы нужны?"
                              value={stage.materialsRequest}
                              onChange={(e) => updateStage(i, "materialsRequest", e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Запрос на строителей</Label>
                            <Textarea
                              placeholder="Какие работы нужно выполнить?"
                              value={stage.buildersRequest}
                              onChange={(e) => updateStage(i, "buildersRequest", e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Запрос на технику</Label>
                            <Textarea
                              placeholder="Какая техника нужна?"
                              value={stage.equipmentRequest}
                              onChange={(e) => updateStage(i, "equipmentRequest", e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Назад
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={loading || stages.every((s) => !s.enabled)}
                >
                  {loading ? "Создание..." : "Создать объект"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
