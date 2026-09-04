import { Home, Map, Plus, Ticket, User, LayoutGrid, Bell, Settings } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import { useIsBusinessAccount } from "@/hooks/useIsBusinessAccount";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RailItem {
  icon: typeof Home;
  label: string;
  path: string;
  requiresAuth?: boolean;
  authAction?: string;
  isCenter?: boolean;
}

const baseItems: RailItem[] = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Map, label: "Explorar", path: "/discover" },
  { icon: Plus, label: "Crear", path: "/create", isCenter: true, requiresAuth: true, authAction: "crear un evento" },
  { icon: Ticket, label: "Entradas", path: "/tickets", requiresAuth: true, authAction: "ver tus entradas" },
  { icon: Bell, label: "Notificaciones", path: "/notifications", requiresAuth: true, authAction: "ver tus notificaciones" },
  { icon: User, label: "Perfil", path: "/profile", requiresAuth: true, authAction: "ver tu perfil" },
  { icon: Settings, label: "Configuración", path: "/settings", requiresAuth: true, authAction: "abrir la configuración" },
];

/**
 * Pinterest-style persistent left rail. Desktop (lg+) only — the mobile
 * bottom bar stays exactly as it is.
 */
export const DesktopNavRail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authPrompt = useAuthPromptSafe();
  const isBusinessAccount = useIsBusinessAccount();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const items = baseItems.map((item) =>
    isBusinessAccount && item.path === "/tickets"
      ? { ...item, icon: LayoutGrid, label: "Gestión", path: "/gestion", authAction: "gestionar tu negocio" }
      : item,
  );

  const handleClick = (e: React.MouseEvent, item: RailItem) => {
    if (item.isCenter) {
      e.preventDefault();
      if (!user && authPrompt) {
        authPrompt.promptAuth({ action: item.authAction || "crear contenido" });
        return;
      }
      setIsPickerOpen(true);
      return;
    }
    if (!user && item.requiresAuth && authPrompt) {
      e.preventDefault();
      authPrompt.promptAuth({ action: item.authAction || "acceder a esta sección" });
    }
  };

  return (
    <>
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {[
              { type: "post", label: "Post" },
              { type: "event", label: "Evento" },
            ].map((option) => (
              <button
                key={option.type}
                onClick={() => {
                  setIsPickerOpen(false);
                  navigate(`/create?type=${option.type}`);
                }}
                className="w-full py-3 rounded-xl bg-secondary text-foreground text-base font-semibold transition-colors lg:hover:bg-secondary/70"
              >
                {option.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-20 flex-col items-center gap-2 border-r border-border bg-background py-4">
        <NavLink to="/" className="mb-4 font-brand text-xl font-semibold text-foreground">
          z
        </NavLink>

        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/settings" && location.pathname.startsWith("/settings"));
          const Icon = item.icon;
          const showBadge = item.path === "/notifications" && !!user && unreadCount > 0;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleClick(e, item)}
              title={item.label}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors lg:hover:bg-secondary",
                isActive && "bg-secondary",
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "text-foreground" : "text-muted-foreground")} />
              {showBadge && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-red" />
              )}
            </NavLink>
          );
        })}
      </aside>
    </>
  );
};
