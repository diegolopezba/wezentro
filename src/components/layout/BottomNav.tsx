import { Home, Map, Plus, MessageCircle, User } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    icon: Home,
    label: "Inicio",
    path: "/",
    requiresAuth: false
  },
  {
    icon: Map,
    label: "Explorar",
    path: "/discover",
    requiresAuth: false
  },
  {
    icon: Plus,
    label: "Crear",
    path: "/create",
    isCenter: true,
    requiresAuth: true,
    authAction: "crear un evento"
  },
  {
    icon: MessageCircle,
    label: "Chats",
    path: "/chats",
    requiresAuth: true,
    authAction: "ver tus mensajes"
  },
  {
    icon: User,
    label: "Perfil",
    path: "/profile",
    requiresAuth: true,
    authAction: "ver tu perfil"
  }
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
        setIsPickerOpen((prev) => !prev);
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
      {/* Backdrop */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            key="picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet picker */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            key="create-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
          >
            {/* Push sheet above the nav bar */}
            <div className="mx-auto max-w-lg px-4 pb-[80px] pt-4">
              <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="px-4 pt-2 pb-4 flex flex-col gap-2">
                  <button
                    onClick={() => handlePickerSelect("post")}
                    className="w-full py-4 rounded-xl bg-secondary/60 hover:bg-secondary active:scale-[0.98] transition-all text-foreground text-base font-semibold"
                  >
                    Post
                  </button>
                  <button
                    onClick={() => handlePickerSelect("event")}
                    className="w-full py-4 rounded-xl bg-secondary/60 hover:bg-secondary active:scale-[0.98] transition-all text-foreground text-base font-semibold"
                  >
                    Evento
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
