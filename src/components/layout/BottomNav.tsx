import { Home, Map, Plus, Ticket, User, LayoutGrid } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import { m } from "framer-motion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { useIsBusinessAccount } from "@/hooks/useIsBusinessAccount";

const navItems = [
  { icon: Home, label: "Inicio", path: "/", requiresAuth: false },
  { icon: Map, label: "Explorar", path: "/discover", requiresAuth: false },
  { icon: Plus, label: "Crear", path: "/create", isCenter: true, requiresAuth: true, authAction: "crear un evento" },
  { icon: Ticket, label: "Entradas", path: "/tickets", requiresAuth: true, authAction: "ver tus entradas" },
  { icon: User, label: "Perfil", path: "/profile", requiresAuth: true, authAction: "ver tu perfil" },
];

const businessNavItems = navItems.map((item) =>
  item.path === "/tickets"
    ? { ...item, icon: LayoutGrid, label: "Gestión", path: "/gestion", authAction: "gestionar tu negocio" }
    : item,
);


export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authPrompt = useAuthPromptSafe();
  const isGuest = !user;
  const isBusinessAccount = useIsBusinessAccount();
  const items = isBusinessAccount ? businessNavItems : navItems;
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent, item: (typeof navItems)[0]) => {
    void haptic("light");
    if (item.isCenter) {
      e.preventDefault();
      if (isGuest && authPrompt) {
        authPrompt.promptAuth({ action: item.authAction || "crear contenido" });
      } else {
        setIsPickerOpen(true);
      }
      return;
    }
    if (isGuest && item.requiresAuth && authPrompt) {
      e.preventDefault();
      authPrompt.promptAuth({ action: item.authAction || "acceder a esta sección" });
    }
  };

  const handlePickerSelect = (type: string) => {
    setIsPickerOpen(false);
    navigate(`/create?type=${type}`);
  };

  return (
    <>
      <Drawer open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DrawerContent className="pb-safe">
          <div className="px-4 pt-2 pb-6 flex flex-col gap-3">
            <button
              onClick={() => handlePickerSelect("post")}
              className="w-full py-4 rounded-xl bg-secondary active:scale-[0.98] transition-transform text-foreground text-base font-semibold select-none [-webkit-tap-highlight-color:transparent]"
            >
              Post
            </button>
            <button
              onClick={() => handlePickerSelect("event")}
              className="w-full py-4 rounded-xl bg-secondary active:scale-[0.98] transition-transform text-foreground text-base font-semibold select-none [-webkit-tap-highlight-color:transparent]"
            >
              Evento
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong safe-bottom">
        <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  className="relative flex items-center justify-center px-4 py-2 no-select [-webkit-tap-highlight-color:transparent] active:scale-90 transition-transform duration-100"
                  onClick={(e) => handleNavClick(e, item)}
                >
                  <m.div
                    animate={{ rotate: isPickerOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 22 }}
                  >
                    <Plus
                      className={cn(
                        "w-6 h-6 transition-colors duration-200",
                        isPickerOpen ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                  </m.div>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex items-center justify-center px-4 py-2 no-select [-webkit-tap-highlight-color:transparent] active:scale-90 transition-transform duration-100"
                onClick={(e) => handleNavClick(e, item)}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};
