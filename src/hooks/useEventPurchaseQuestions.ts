import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type QuestionType = "short_text" | "long_text" | "phone" | "boolean" | "select";
export type QuestionScope = "areas" | "all";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Texto corto",
  long_text: "Texto largo",
  phone: "Teléfono",
  boolean: "Sí / No",
  select: "Opción múltiple",
};

export interface PurchaseQuestion {
  id: string;
  event_id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  scope: QuestionScope;
  display_order: number;
}

export const makeDraftQuestion = (order = 0): PurchaseQuestion => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  event_id: "",
  label: "",
  type: "short_text",
  required: false,
  options: [],
  scope: "areas",
  display_order: order,
});

export const useEventPurchaseQuestions = (eventId: string | undefined) =>
  useQuery({
    queryKey: ["event-purchase-questions", eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async (): Promise<PurchaseQuestion[]> => {
      const { data, error } = await db
        .from("event_purchase_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as PurchaseQuestion[];
    },
  });

/** Replaces the whole question set of an event (small lists, simplest to reason about). */
export const useSaveEventPurchaseQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      questions,
    }: {
      eventId: string;
      questions: PurchaseQuestion[];
    }) => {
      const { error: delErr } = await db
        .from("event_purchase_questions")
        .delete()
        .eq("event_id", eventId);
      if (delErr) throw delErr;

      const rows = questions
        .filter((q) => q.label.trim().length > 0)
        .map((q, i) => ({
          event_id: eventId,
          label: q.label.trim(),
          type: q.type,
          required: q.required,
          options: q.type === "select" ? q.options.filter(Boolean) : [],
          scope: q.scope,
          display_order: i,
        }));
      if (rows.length === 0) return;
      const { error } = await db.from("event_purchase_questions").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["event-purchase-questions", vars.eventId] });
    },
  });
};
