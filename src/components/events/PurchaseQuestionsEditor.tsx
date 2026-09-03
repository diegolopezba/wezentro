import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUESTION_TYPE_LABELS,
  makeDraftQuestion,
  type PurchaseQuestion,
  type QuestionScope,
  type QuestionType,
} from "@/hooks/useEventPurchaseQuestions";

interface Props {
  questions: PurchaseQuestion[];
  onChange: (questions: PurchaseQuestion[]) => void;
}

/**
 * Luma-style purchase questions: the organizer defines what to ask the buyer
 * before paying. Answers are stored with the booking and shown in Gestión.
 */
export function PurchaseQuestionsEditor({ questions, onChange }: Props) {
  const update = (id: string, patch: Partial<PurchaseQuestion>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const remove = (id: string) => onChange(questions.filter((q) => q.id !== id));

  const add = () => onChange([...questions, makeDraftQuestion(questions.length)]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Preguntas al comprar</p>
        <p className="text-xs text-muted-foreground">
          Datos extra que le pedís al comprador antes de pagar. Las respuestas quedan en la reserva.
        </p>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="rounded-2xl border border-border p-3 space-y-3">
          <div className="flex items-start gap-2">
            <Input
              value={q.label}
              placeholder="Ej: Nombre del grupo"
              onChange={(e) => update(q.id, { label: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive"
              onClick={() => remove(q.id)}
              aria-label="Eliminar pregunta"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update(q.id, { type: t })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border",
                  q.type === t
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary/50 border-border text-foreground",
                )}
              >
                {QUESTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {q.type === "select" && (
            <Input
              value={q.options.join(", ")}
              placeholder="Opciones separadas por coma"
              onChange={(e) =>
                update(q.id, {
                  options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                })
              }
            />
          )}

          <div className="flex flex-wrap gap-2">
            {(["areas", "all"] as QuestionScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update(q.id, { scope: s })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border",
                  q.scope === s
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary/50 border-border text-foreground",
                )}
              >
                {s === "areas" ? "Solo lounges" : "Todas las compras"}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Obligatoria</span>
            <Switch
              checked={q.required}
              onCheckedChange={(v) => update(q.id, { required: v })}
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full rounded-full" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />
        Agregar pregunta
      </Button>
    </div>
  );
}
