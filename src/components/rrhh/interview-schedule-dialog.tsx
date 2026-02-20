"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { scheduleInternInterview } from "@/actions/interns";
import { Calendar, Video } from "lucide-react";

export function InterviewScheduleDialog({
  open,
  onOpenChange,
  applicantId,
  applicantName,
  hasCalendarAccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
  hasCalendarAccess: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("45");
  const [addMeetLink, setAddMeetLink] = useState(hasCalendarAccess);

  function handleSubmit() {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await scheduleInternInterview(applicantId, {
        date,
        time,
        durationMinutes: parseInt(duration),
        addMeetLink: addMeetLink && hasCalendarAccess,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          result.meetLink
            ? `Entrevista programada con enlace Meet: ${result.meetLink}`
            : "Entrevista programada y correo enviado."
        );
        router.refresh();
        setTimeout(() => onOpenChange(false), 2000);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar entrevista
          </DialogTitle>
          <DialogDescription>
            Programar una entrevista de pasantía con {applicantName}. Se enviará un correo automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
              {success}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duración</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasCalendarAccess && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Google Meet</p>
                  <p className="text-xs text-muted-foreground">Crear enlace de videollamada</p>
                </div>
              </div>
              <Switch checked={addMeetLink} onCheckedChange={setAddMeetLink} />
            </div>
          )}

          {!hasCalendarAccess && (
            <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
              Para crear eventos con Google Meet, conecte su cuenta de Google desde Configuración.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !date || !time}
          >
            {isPending ? "Programando..." : "Programar entrevista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
