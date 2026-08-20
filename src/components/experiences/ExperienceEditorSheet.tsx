import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useExperienceConfig,
  useSaveExperience,
  type Experience,
} from "@/hooks/useExperiences";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  experience?: Experience | null;
  /** False when the business has no payout account yet: publishing is blocked. */
  canPublish?: boolean;
  onRequirePayouts?: () => void;
}

interface SegmentDraft {
  name: string;
  price: string;
}

/** Create / edit an experience: details, price segments, weekly slots and rules. */
export const ExperienceEditorSheet = ({
  open,
  onOpenChange,
  businessId,
  experience,
  canPublish = true,
  onRequirePayouts,
}: Props) => {
  const { data: config } = useExperienceConfig(experience?.id);
  const save = useSaveExperience();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [duration, setDuration] = useState("60");
  const [isActive, setIsActive] = useState(true);
  const [segments, setSegments] = useState<SegmentDraft[]>([{ name: "General", price: "" }]);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [interval, setInterval] = useState("60");
  const [spots, setSpots] = useState("8");
  const [lead, setLead] = useState("60");
  const [maxPerBooking, setMaxPerBooking] = useState("8");

  useEffect(() => {
    if (!open) return;
    setTitle(experience?.title ?? "");
    setDescription(experience?.description ?? "");
    setLocationNote(experience?.location_note ?? "");
    setDuration(String(experience?.duration_minutes ?? 60));
    setIsActive(canPublish ? experience?.is_active ?? true : false);
  }, [open, experience]);

  useEffect(() => {
    if (!open || !config) return;
    if (config.segments.length) {
      setSegments(config.segments.map((s) => ({ name: s.name, price: String(s.price) })));
    }
    if (config.schedules.length) {
      setWeekdays(config.schedules.map((s) => s.weekday));
      setStartTime(config.schedules[0].start_time.slice(0, 5));
      setEndTime(config.schedules[0].end_time.slice(0, 5));
      setInterval(String(config.schedules[0].slot_interval_minutes));
    }
    if (config.policies) {
      setSpots(String(config.policies.spots_per_slot));
      setLead(String(config.policies.min_lead_minutes));
      setMaxPerBooking(String(config.policies.max_per_booking));
    }
  }, [open, config]);

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const validSegments = segments.filter((s) => s.name.trim() && Number(s.price) >= 0 && s.price !== "");
  const canSave = title.trim().length > 1 && validSegments.length > 0 && weekdays.length > 0;

  const handleSave = () => {
    save.mutate(
      {
        id: experience?.id,
        business_id: businessId,
        title,
        description,
        location_note: locationNote,
        duration_minutes: Number(duration) || 60,
        is_active: canPublish && isActive,
        segments: validSegments.map((s) => ({ name: s.name, price: Number(s.price) })),
        weekdays,
        start_time: startTime,
        end_time: endTime,
        slot_interval_minutes: Number(interval) || 60,
        spots_per_slot: Number(spots) || 8,
        min_lead_minutes: Number(lead) || 60,
        max_per_booking: Number(maxPerBooking) || 8,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-0">
        <SheetTitle className="font-brand text-[22px] font-medium text-foreground">
          {experience ? "Editar experiencia" : "Nueva experiencia"}
        </SheetTitle>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Buceo al amanecer" />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué incluye, qué llevar, nivel requerido…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label>Duración (min)</Label>
              <Input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Punto de encuentro</Label>
              <Input value={locationNote} onChange={(e) => setLocationNote(e.target.value)} placeholder="Muelle 3" />
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-2">
            <Label>Opciones y precios</Label>
            <div className="space-y-2">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    value={s.name}
                    placeholder="Adulto"
                    onChange={(e) =>
                      setSegments((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    value={s.price}
                    placeholder="Bs. 0"
                    onChange={(e) =>
                      setSegments((prev) => prev.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    className="p-2 text-muted-foreground"
                    onClick={() => setSegments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
              onClick={() => setSegments((prev) => [...prev, { name: "", price: "" }])}
            >
              <Plus className="h-4 w-4" /> Agregar opción
            </button>
          </div>

          {/* Days */}
          <div className="space-y-2">
            <Label>Días disponibles</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    weekdays.includes(i)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-muted/50 text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0 space-y-2">
              <Label>Desde</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Hasta</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Cada (min)</Label>
              <Input inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0 space-y-2">
              <Label>Cupos/horario</Label>
              <Input inputMode="numeric" value={spots} onChange={(e) => setSpots(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Antelación (min)</Label>
              <Input inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Máx. por reserva</Label>
              <Input inputMode="numeric" value={maxPerBooking} onChange={(e) => setMaxPerBooking(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Publicada</p>
              <p className="text-xs text-muted-foreground">
                {canPublish
                  ? "Visible y reservable para los clientes"
                  : "Configurá tus datos de cobro para poder publicarla"}
              </p>
            </div>
            <Switch
              checked={isActive && canPublish}
              onCheckedChange={(v) => {
                if (v && !canPublish) {
                  onRequirePayouts?.();
                  return;
                }
                setIsActive(v);
              }}
            />
          </div>
        </div>

        <div className="sticky bottom-0 mt-6 bg-background/95 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
          <Button
            variant="sheet-action"
            className="h-12 w-full rounded-full text-base"
            disabled={!canSave || save.isPending}
            onClick={handleSave}
          >
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
