import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WaitlistState {
  isOnWaitlist: boolean;
  position: number | null;
  total: number;
}

export function useEventWaitlist(eventId: string | undefined, enabled = true) {
  const { user } = useAuth();

  return useQuery<WaitlistState>({
    queryKey: ["event-waitlist", eventId, user?.id ?? null],
    enabled: !!eventId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("event_waitlist")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId!);

      let position: number | null = null;
      if (user?.id) {
        const { data } = await supabase
          .from("event_waitlist")
          .select("position")
          .eq("event_id", eventId!)
          .eq("user_id", user.id)
          .maybeSingle();
        position = data?.position ?? null;
      }

      return { isOnWaitlist: position != null, position, total: count ?? 0 };
    },
  });
}

export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.rpc("join_event_waitlist", { _event_id: eventId });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_d, eventId) => {
      qc.invalidateQueries({ queryKey: ["event-waitlist", eventId] });
      toast.success("Estás en la lista de espera");
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      toast.error(
        msg.includes("full")
          ? "La lista de espera está llena"
          : msg.includes("already on sale")
          ? "Las entradas ya están a la venta"
          : "No pudimos añadirte a la lista"
      );
    },
  });
}

export function useLeaveWaitlist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("event_waitlist")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_d, eventId) => {
      qc.invalidateQueries({ queryKey: ["event-waitlist", eventId] });
      toast.success("Saliste de la lista de espera");
    },
    onError: () => toast.error("No pudimos actualizar la lista"),
  });
}

/** Owner action: release tickets now (or let the cron do it at sales_open_at). */
export function useReleaseWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.functions.invoke("release-event-waitlist", {
        body: { eventId },
      });
      if (error) throw error;
      return data as { notified: number };
    },
    onSuccess: (data, eventId) => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["event-waitlist", eventId] });
      toast.success(`Entradas publicadas · ${data?.notified ?? 0} avisos enviados`);
    },
    onError: () => toast.error("No pudimos publicar las entradas"),
  });
}
