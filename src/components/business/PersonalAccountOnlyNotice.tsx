import { UserRound } from "lucide-react";

interface Props {
  /** e.g. "comprar entradas", "reservar una mesa", "reservar una experiencia" */
  action: string;
}

/**
 * Shown in place of the final checkout CTA when a Business account tries to act
 * as a customer. Business accounts can browse the whole flow, but the purchase
 * itself belongs to a personal account.
 */
export const PersonalAccountOnlyNotice = ({ action }: Props) => (
  <div className="rounded-2xl border border-border bg-muted/50 p-4 flex gap-3">
    <UserRound className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" />
    <div className="text-sm">
      <p className="font-medium text-foreground">Solo las cuentas personales pueden {action}</p>
      <p className="mt-1 text-muted-foreground leading-snug">
        Estás usando una cuenta Business. Iniciá sesión con tu cuenta personal para completar
        esta acción.
      </p>
    </div>
  </div>
);
