"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Trash2, Loader2, Save, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTherapistAvailability, setTherapistAvailability } from "@/actions/therapist-availability";
import { toast } from "sonner";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

interface Block {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  modality: "presencial" | "online" | "ambos";
  active: boolean;
}

interface Props {
  therapistId: string;
  isAdmin?: boolean;
}

export function AvailabilityManager({ therapistId, isAdmin }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTherapistAvailability(therapistId).then((data) => {
      if (data.length > 0) {
        setBlocks(data.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          slotDurationMinutes: d.slotDurationMinutes,
          modality: d.modality as "presencial" | "online" | "ambos",
          active: d.active,
        })));
      }
      setLoading(false);
    });
  }, [therapistId]);

  function addBlock(dayOfWeek: number) {
    setBlocks((prev) => [...prev, {
      dayOfWeek,
      startTime: "09:00",
      endTime: "13:00",
      slotDurationMinutes: 50,
      modality: "ambos",
      active: true,
    }]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBlock(index: number, field: keyof Block, value: string | number | boolean) {
    setBlocks((prev) => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }

  async function handleSave() {
    setSaving(true);
    const result = await setTherapistAvailability(therapistId, blocks.filter((b) => b.active));
    if (result.success) {
      toast.success("Horarios guardados correctamente");
    }
    setSaving(false);
  }

  function initializeDefaults() {
    const defaults: Block[] = [];
    for (const day of WORK_DAYS) {
      defaults.push({ dayOfWeek: day, startTime: "09:00", endTime: "13:00", slotDurationMinutes: 50, modality: "ambos", active: true });
      defaults.push({ dayOfWeek: day, startTime: "14:00", endTime: "18:00", slotDurationMinutes: 50, modality: "ambos", active: true });
    }
    setBlocks(defaults);
  }

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando horarios...</span>
        </CardContent>
      </Card>
    );
  }

  // Group blocks by day
  const byDay = new Map<number, { block: Block; index: number }[]>();
  blocks.forEach((b, i) => {
    const list = byDay.get(b.dayOfWeek) || [];
    list.push({ block: b, index: i });
    byDay.set(b.dayOfWeek, list);
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-rasma-dark" />
            Horarios de atencion
          </CardTitle>
          <div className="flex gap-2">
            {blocks.length === 0 && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={initializeDefaults}>
                <Plus className="h-3.5 w-3.5" /> Horario estandar
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-1.5 bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-7 w-7 text-zinc-300" />
            </div>
            <p className="text-sm font-medium text-rasma-dark">Sin horarios configurados</p>
            <p className="text-xs text-muted-foreground mt-1">Los pacientes no podran agendar citas online</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-1.5" onClick={initializeDefaults}>
              <Plus className="h-3.5 w-3.5" /> Crear horario estandar (Lun-Vie 9-18h)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const dayBlocks = byDay.get(day) || [];
              const isWorkDay = WORK_DAYS.includes(day);

              return (
                <div key={day} className={cn("rounded-xl border p-3", dayBlocks.length === 0 && "opacity-50")}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-rasma-dark">{DAY_LABELS[day]}</p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addBlock(day)}>
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>

                  {dayBlocks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin horarios</p>
                  ) : (
                    <div className="space-y-2">
                      {dayBlocks.map(({ block, index }) => (
                        <div key={index} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="time"
                            value={block.startTime}
                            onChange={(e) => updateBlock(index, "startTime", e.target.value)}
                            className="border rounded-lg px-2 py-1 text-sm w-24 bg-zinc-50"
                          />
                          <span className="text-xs text-muted-foreground">a</span>
                          <input
                            type="time"
                            value={block.endTime}
                            onChange={(e) => updateBlock(index, "endTime", e.target.value)}
                            className="border rounded-lg px-2 py-1 text-sm w-24 bg-zinc-50"
                          />
                          <select
                            value={block.slotDurationMinutes}
                            onChange={(e) => updateBlock(index, "slotDurationMinutes", Number(e.target.value))}
                            className="border rounded-lg px-2 py-1 text-xs bg-zinc-50"
                          >
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={50}>50 min</option>
                            <option value={60}>60 min</option>
                            <option value={90}>90 min</option>
                          </select>
                          <select
                            value={block.modality}
                            onChange={(e) => updateBlock(index, "modality", e.target.value)}
                            className="border rounded-lg px-2 py-1 text-xs bg-zinc-50"
                          >
                            <option value="ambos">Ambos</option>
                            <option value="presencial">Presencial</option>
                            <option value="online">Online</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rasma-red"
                            onClick={() => removeBlock(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
