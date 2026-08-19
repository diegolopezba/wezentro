import { useState } from "react";
import { Search, X, UserPlus } from "lucide-react";
import { useSearchUsers, type SearchUser } from "@/hooks/useSearchUsers";
import { getDefaultAvatar } from "@/lib/defaultAvatar";

interface TicketAssigneeRowProps {
  index: number;
  value: SearchUser | null;
  excludeIds: string[];
  onChange: (user: SearchUser | null) => void;
}

/** One extra ticket: optionally tag the zentro user it belongs to. */
export function TicketAssigneeRow({ index, value, excludeIds, onChange }: TicketAssigneeRowProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results, isLoading } = useSearchUsers(query);

  const visible = (results || []).filter((u) => !excludeIds.includes(u.id));

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border px-3 py-2.5">
        <img
          src={value.avatar_url || getDefaultAvatar(value.id)}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Entrada {index + 2}</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {value.full_name || value.username}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Quitar persona"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Entrada {index + 2}</p>
          {open ? (
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar usuario…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm font-semibold text-foreground active:opacity-70"
            >
              Etiquetar a alguien (opcional)
            </button>
          )}
        </div>
      </div>

      {open && query.length >= 2 && (
        <div className="mt-2 max-h-44 overflow-y-auto space-y-1">
          {isLoading && <p className="text-xs text-muted-foreground px-1 py-2">Buscando…</p>}
          {!isLoading && visible.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">
              Sin resultados. Podés dejarla sin asignar y reenviar la entrada por correo.
            </p>
          )}
          {visible.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-1 py-2 rounded-xl active:bg-secondary text-left"
            >
              <img
                src={u.avatar_url || getDefaultAvatar(u.id)}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-sm text-foreground truncate">{u.full_name || u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
