import { useMemo, useState } from "react";
import { Search, UserCheck, Loader2, Download, Armchair } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useEventGuestlist } from "@/hooks/useEvents";
import { useTicketBreakdown } from "@/hooks/usePromoters";
import { useEventAreaBookings } from "@/hooks/useVenueLayouts";
import { downloadXlsx } from "@/lib/inviteImport";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface Row {
  key: string;
  name: string;
  avatar: string | null;
  type: string;
  isLounge: boolean;
  extra: number;
  checkedIn: boolean;
  /** Only single (non-grouped) entries can be checked in from here. */
  qrToken: string | null;
}

export const EventGuestsPanel = ({ eventId }: { eventId: string }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: entries, isLoading } = useEventGuestlist(eventId);
  const { data: tiers } = useTicketBreakdown(eventId);
  const { data: bookings } = useEventAreaBookings(eventId);

  const { data: scannerToken } = useQuery({
    queryKey: ["scanner-token", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("scanner_access_token")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return (data as any).scanner_access_token as string;
    },
  });

  // Same write path as the bouncer scanner — no second check-in code path.
  const checkIn = useMutation({
    mutationFn: async (qrToken: string) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-in-guest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(scannerToken ? { "x-scanner-key": scannerToken } : {}),
          },
          body: JSON.stringify({ qr_code_token: qrToken, event_id: eventId }),
        },
      );
      const data = await res.json();
      if (!data.success && !data.alreadyUsed) throw new Error(data.error || "No se pudo registrar");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
      toast.success(data.alreadyUsed ? "Ya tenía check-in" : "Check-in registrado");
    },
    onError: (e: any) => toast.error(e?.message || "No se pudo registrar el check-in"),
  });

  const tierName = useMemo(() => {
    const m: Record<string, string> = {};
    (tiers || []).forEach((t) => { m[t.tier_id] = t.name; });
    return m;
  }, [tiers]);

  const bookingById = useMemo(() => {
    const m: Record<string, any> = {};
    (bookings || []).forEach((b) => { m[b.id] = b; });
    return m;
  }, [bookings]);

  const rows: Row[] = useMemo(() => {
    const list = (entries || []) as any[];
    const out: Row[] = [];
    const groups: Record<string, { count: number; checked: number }> = {};

    for (const e of list) {
      if (e.area_booking_id) {
        const g = (groups[e.area_booking_id] ||= { count: 0, checked: 0 });
        g.count += 1;
        if (e.checked_in_at) g.checked += 1;
        continue;
      }
      out.push({
        key: e.id,
        name: e.user?.full_name || e.user?.username || e.guest_name || "Invitado",
        avatar: e.user?.avatar_url ?? null,
        type: e.ticket_tier_id ? (tierName[e.ticket_tier_id] || "Entrada") : e.is_special_guest ? (e.special_guest_label || "Invitado especial") : "Entrada",
        isLounge: false,
        extra: 0,
        checkedIn: !!e.checked_in_at,
        qrToken: e.qr_code_token ?? null,
      });
    }

    for (const [bookingId, g] of Object.entries(groups)) {
      const b = bookingById[bookingId];
      out.push({
        key: `lounge-${bookingId}`,
        name: b?.buyer_full_name || b?.buyer_username || "Reserva de lounge",
        avatar: b?.buyer_avatar_url ?? null,
        type: b?.area_name || "Lounge",
        isLounge: true,
        extra: Math.max(0, g.count - 1),
        checkedIn: g.checked > 0,
        qrToken: null,
      });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [entries, tierName, bookingById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }, [rows, search]);

  const totalGuests = (entries || []).length;
  const totalCheckedIn = ((entries || []) as any[]).filter((e) => e.checked_in_at).length;

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("No hay invitados para exportar");
      return;
    }
    const data = rows.map((r) => ({
      Nombre: r.extra > 0 ? `${r.name} +${r.extra}` : r.name,
      Tipo: r.type,
      "Check-in": r.checkedIn ? "Sí" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invitados");
    downloadXlsx("invitados.xlsx", XLSX.write(wb, { bookType: "xlsx", type: "array" }));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar invitado…"
          className="pl-9 rounded-full"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {rows.length === 0 ? "Todavía no hay invitados." : "Sin resultados."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={r.avatar || DEFAULT_AVATAR} alt="" />
                <AvatarFallback>{r.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.name}{r.extra > 0 ? ` +${r.extra}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  {r.isLounge && <Armchair className="w-3 h-3" />}
                  {r.type}
                </p>
              </div>
              {r.checkedIn ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-600 flex-shrink-0">
                  Check-in
                </span>
              ) : r.qrToken ? (
                <button
                  type="button"
                  onClick={() => { haptic("medium"); checkIn.mutate(r.qrToken!); }}
                  disabled={checkIn.isPending}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full bg-secondary text-xs font-medium text-foreground active:opacity-70",
                  )}
                >
                  {checkIn.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Check-in
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">Pendiente</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-card border border-border p-3">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-semibold">{totalGuests}</span> invitados ·{" "}
          <span className="text-foreground font-semibold">{totalCheckedIn}</span> con check-in
        </p>
        <Button variant="secondary" className="rounded-full h-9 text-xs gap-1.5" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Exportar
        </Button>
      </div>
    </div>
  );
};
