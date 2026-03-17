import { Home, Map, Plus, MessageCircle, User, X, Sparkles, PartyPopper } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CREATE_OPTIONS = [
  {
    id: "post",
    label: "Post",
    icon: Sparkles,
    type: "post",
    x: -88,
    y: -90,
    delay: 0,
  },
  {
    id: "event",
    label: "Evento",
    icon: PartyPopper,
    type: "event",
    x: 88,
    y: -90,
    delay: 0.06,
  },
];

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

      {/* Radial options — rendered above backdrop, anchored near the + button */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            {CREATE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.id}
                  className="absolute pointer-events-auto flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-full"
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  animate={{ x: opt.x, y: opt.y, opacity: 1, scale: 1 }}
                  exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24, delay: opt.delay }}
                  onClick={() => handlePickerSelect(opt.type)}
                >
                  <div className="w-14 h-14 rounded-full bg-card border border-border/60 shadow-elevated flex items-center justify-center">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground bg-card/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/40 shadow-sm whitespace-nowrap">
                    {opt.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
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
