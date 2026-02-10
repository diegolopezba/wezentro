import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, CalendarDays, Clock, StickyNote, UserPlus, X } from "lucide-react";
import { useCreateReservation, useAvailableCapacity } from "@/hooks/useReservations";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { useSearchUsers, SearchUser } from "@/hooks/useSearchUsers";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface ReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  businessHours?: string | null;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
];

export const ReservationSheet = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  businessHours,
}: ReservationSheetProps) => {
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
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

  const handleSubmit = () => {
    if (!user) {
      promptAuth({ action: "hacer una reserva" });
      return;
    }
    if (!selectedDate || !selectedTime) return;

    if (capacityData?.available !== null && capacityData?.available !== undefined && partySize > capacityData.available) {
      return;
    }

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
        onSuccess: () => {
          onOpenChange(false);
          setSelectedDate(undefined);
          setSelectedTime("");
          setPartySize(2);
          setNotes("");
          setTaggedGuests([]);
          setGuestSearch("");
        },
      }
    );
  };

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  const isFormValid = selectedDate && selectedTime && partySize >= 1;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-brand">
            Reservar en {businessName}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5 overflow-y-auto">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="w-4 h-4 text-orange-500" />
              Fecha
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                disabled={(date) =>
                  isBefore(date, today) || date > maxDate
                }
                className="rounded-xl border"
              />
            </div>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-orange-500" />
              Hora
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una hora" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {businessHours && (
              <p className="text-xs text-muted-foreground">
                Horario: {businessHours.split("\n")[0]}
              </p>
            )}
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-orange-500" />
              Personas
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                disabled={partySize <= 1}
                className="h-10 w-10"
              >
                -
              </Button>
              <Input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
                disabled={partySize >= 20}
                className="h-10 w-10"
              >
                +
              </Button>
            </div>
            {/* Availability indicator */}
            {capacityData?.available !== null && capacityData?.available !== undefined && (
              <p className={`text-xs ${capacityData.available <= 0 ? "text-destructive" : capacityData.available <= 5 ? "text-orange-500" : "text-muted-foreground"}`}>
                {capacityData.available <= 0
                  ? "Sin disponibilidad para este horario"
                  : `${capacityData.available} lugares disponibles`}
              </p>
            )}
          </div>

          {/* Invitados (Guest Tagging) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="w-4 h-4 text-orange-500" />
              Invitados (opcional)
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
              <div className="border rounded-lg max-h-32 overflow-y-auto divide-y">
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
              <StickyNote className="w-4 h-4 text-orange-500" />
              Notas (opcional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, celebraciones, preferencias de asiento..."
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createMutation.isPending || (capacityData?.available !== null && capacityData?.available !== undefined && partySize > capacityData.available)}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Confirmar Reserva
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
