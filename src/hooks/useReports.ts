import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ReportTargetType = "event" | "post" | "comment" | "profile" | "message";
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "nudity"
  | "violence"
  | "illegal"
  | "self_harm"
  | "impersonation"
  | "other";

export interface ReportInput {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details?: string;
}

export const useCreateReport = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      const { error } = await (supabase as any).from("reports").insert({
        reporter_id: user.id,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
        details: input.details ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura.");
    },
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes("duplicate")) {
        toast.info("Ya reportaste este contenido");
      } else {
        toast.error(err.message || "Error al enviar el reporte");
      }
    },
  });
};
