import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Users, CalendarDays, Clock, StickyNote, UserPlus, X, ChevronRight } from "lucide-react";
import { useCreateReservation, useAvailableCapacity } from "@/hooks/useReservations";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { useSearchUsers, SearchUser } from "@/hooks/useSearchUsers";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  businessHours?: string | null;
}

// Generate time slots from 08:00 to 22:30 in 30min intervals
const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});

// Generate next N days as chips
function getDateChips(n = 21) {
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => addDays(today, i));
}

const DATE_CHIPS = getDateChips(21);

type Step = "date" | "time" | "size" | "extras";

const STEPS: Step[] = ["date", "time", "size", "extras"];

const stepLabel: Record<Step, string> = {
  date: "Fecha",
  time: "Hora",
  size: "Personas",
  extras: "Detalles",
};

const stepIcon: Record<Step, React.ReactNode> = {
  date: <CalendarDays className="w-3.5 h-3.5" />,
  time: <Clock className="w-3.5 h-3.5" />,
  size: <Users className="w-3.5 h-3.5" />,
  extras: <StickyNote className="w-3.5 h-3.5" />,
};

export const ReservationSheet = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  businessHours,
}: ReservationSheetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { promptAuth } = useAuthPrompt();

  const [currentStep, setCurrentStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [taggedGuests, setTaggedGuests] = useState<SearchUser[]>([]);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
  const timeStr = selectedTime ? `${selectedTime}:00` : undefined;

  const { data: capacityData } = useAvailableCapacity(businessId, dateStr, timeStr);
  const { data: searchResults } = useSearchUsers(guestSearch);
  const createMutation = useCreateReservation();

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canProceedFrom = (step: Step) => {
    if (step === "date") return !!selectedDate;
    if (step === "time") return !!selectedTime;
    if (step === "size") return partySize >= 1;
    return true;
  };

  const goNext = () => {
    const next = STEPS[currentStepIndex + 1];
    if (next) setCurrentStep(next);
  };

  const handleSubmit = () => {
    if (!user) {
      promptAuth({ action: "hacer una reserva" });
      return;
    }
    if (!selectedDate || !selectedTime) return;

    createMutation.mutate(
      {
        business_id: businessId,
        reservation_date: format(selectedDate, "yyyy-MM-dd"),
        reservation_time: `${selectedTime}:00`,
        party_size: partySize,
        notes: notes.trim() || undefined,
        tagged_user_ids: taggedGuests.map((g) => g.id),
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          // reset
          setCurrentStep("date");
          setSelectedDate(undefined);
          setSelectedTime("");
          setPartySize(2);
          setNotes("");
          setTaggedGuests([]);
          setGuestSearch("");
          navigate(`/reservation/${data.id}`);
        },
      }
    );
  };

  const isOverCapacity =
    capacityData?.available !== null &&
    capacityData?.available !== undefined &&
    partySize > capacityData.available;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col">
        <DrawerHeader className="pb-3 shrink-0">
          <DrawerTitle className="text-lg font-brand">
            Reservar en {businessName}
          </DrawerTitle>

          {/* Step progress bar */}
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((step, idx) => (
              <button
                key={step}
                onClick={() => idx < currentStepIndex && setCurrentStep(step)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-xs font-medium transition-all",
                  idx === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : idx < currentStepIndex
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-secondary text-muted-foreground cursor-default"
                )}
              >
                {stepIcon[step]}
                <span className="hidden sm:inline">{stepLabel[step]}</span>
              </button>
            ))}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <AnimatePresence mode="wait">
            {/* STEP: DATE */}
            {currentStep === "date" && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 py-2"
              >
                <p className="text-sm text-muted-foreground">¿Cuándo quieres ir?</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
                  {DATE_CHIPS.map((date) => {
                    const isSelected =
                      selectedDate && format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
                    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl border transition-all shrink-0 snap-start min-w-[56px]",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        <span className={cn("text-[10px] font-medium uppercase", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {isToday ? "Hoy" : format(date, "EEE", { locale: es })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {format(date, "d")}
                        </span>
                        <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {format(date, "MMM", { locale: es })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {businessHours && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Horario: {businessHours.split("\n")[0]}
                  </p>
                )}
              </motion.div>
            )}

            {/* STEP: TIME */}
            {currentStep === "time" && (
              <motion.div
                key="time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 py-2"
              >
                <p className="text-sm text-muted-foreground">
                  {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "py-2 rounded-xl text-sm font-medium border transition-all",
                        selectedTime === time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50 text-foreground"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP: PARTY SIZE */}
            {currentStep === "size" && (
              <motion.div
                key="size"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-2"
              >
                <p className="text-sm text-muted-foreground">
                  {selectedDate && selectedTime && `${format(selectedDate, "d MMM", { locale: es })} a las ${selectedTime}`}
                </p>

                <div className="flex flex-col items-center gap-6 py-6">
                  <div className="flex items-center gap-8">
                    <button
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      disabled={partySize <= 1}
                      className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-2xl font-light disabled:opacity-30 hover:border-primary/60 transition-all"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <span className="text-5xl font-bold text-foreground">{partySize}</span>
                      <p className="text-sm text-muted-foreground mt-1">{partySize === 1 ? "persona" : "personas"}</p>
                    </div>
                    <button
                      onClick={() => setPartySize(Math.min(20, partySize + 1))}
                      disabled={partySize >= 20}
                      className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-2xl font-light disabled:opacity-30 hover:border-primary/60 transition-all"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick pick */}
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 6, 8].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPartySize(n)}
                        className={cn(
                          "w-9 h-9 rounded-full text-sm font-medium border transition-all",
                          partySize === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {capacityData?.available !== null && capacityData?.available !== undefined && (
                  <div className={cn(
                    "text-center text-sm px-3 py-2 rounded-xl",
                    capacityData.available <= 0
                      ? "bg-destructive/10 text-destructive"
                      : capacityData.available <= 5
                      ? "bg-warning/10 text-warning"
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {capacityData.available <= 0
                      ? "Sin disponibilidad para este horario"
                      : `${capacityData.available} lugares disponibles`}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP: EXTRAS (guests + notes) */}
            {currentStep === "extras" && (
              <motion.div
                key="extras"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 py-2"
              >
                {/* Summary pill */}
                <div className="flex gap-2 flex-wrap">
                  {selectedDate && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      <CalendarDays className="w-3 h-3" />
                      {format(selectedDate, "d MMM", { locale: es })}
                    </span>
                  )}
                  {selectedTime && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {selectedTime}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    <Users className="w-3 h-3" />
                    {partySize} {partySize === 1 ? "persona" : "personas"}
                  </span>
                </div>

                {/* Guests */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Invitados <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  {taggedGuests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {taggedGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-sm"
                        >
                          <img
                            src={guest.avatar_url || DEFAULT_AVATAR}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-foreground">@{guest.username}</span>
                          <button
                            type="button"
                            onClick={() => setTaggedGuests((prev) => prev.filter((g) => g.id !== guest.id))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Buscar usuario..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                  />
                  {guestSearch.length >= 2 && searchResults && searchResults.length > 0 && (
                    <div className="border rounded-xl max-h-36 overflow-y-auto divide-y">
                      {searchResults
                        .filter((u) => u.id !== user?.id && !taggedGuests.some((g) => g.id === u.id))
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-secondary/50"
                            onClick={() => {
                              setTaggedGuests((prev) => [...prev, u]);
                              setGuestSearch("");
                            }}
                          >
                            <img
                              src={u.avatar_url || DEFAULT_AVATAR}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">{u.full_name || u.username}</p>
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <StickyNote className="w-4 h-4 text-primary" />
                    Notas <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Alergias, celebraciones, preferencias de asiento..."
                    rows={2}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 300);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="px-4 pb-6 pt-3 border-t shrink-0">
          {currentStep !== "extras" ? (
            <Button
              className="w-full"
              variant="hero"
              disabled={!canProceedFrom(currentStep)}
              onClick={goNext}
            >
              Continuar
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || isOverCapacity}
              className="w-full"
              variant="hero"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirmar Reserva
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
