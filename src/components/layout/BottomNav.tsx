import { Home, Map, Plus, MessageCircle, User } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import { motion } from "framer-motion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Inicio", path: "/", requiresAuth: false },
  { icon: Map, label: "Explorar", path: "/discover", requiresAuth: false },
  { icon: Plus, label: "Crear", path: "/create", isCenter: true, requiresAuth: true, authAction: "crear un evento" },
  { icon: MessageCircle, label: "Chats", path: "/chats", requiresAuth: true, authAction: "ver tus mensajes" },
  { icon: User, label: "Perfil", path: "/profile", requiresAuth: true, authAction: "ver tu perfil" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authPrompt = useAuthPromptSafe();
  const isGuest = !user;
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
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
              className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all text-foreground text-base font-semibold"
            >
              Post
            </button>
            <button
              onClick={() => handlePickerSelect("event")}
              className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all text-foreground text-base font-semibold"
            >
              Evento
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  className="relative flex items-center justify-center px-4 py-2 no-select"
                  onClick={(e) => handleNavClick(e, item)}
                >
                  <motion.div
                    animate={{ rotate: isPickerOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 22 }}
                  >
                    <Plus
                      className={cn(
                        "w-6 h-6 transition-colors duration-200",
                        isPickerOpen ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex items-center justify-center px-4 py-2 no-select"
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
