import { Home, Map, Plus, MessageCircle, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";

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
  const { user } = useAuth();
  const authPrompt = useAuthPromptSafe();
  const isGuest = !user;

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (isGuest && item.requiresAuth && authPrompt) {
      e.preventDefault();
      authPrompt.promptAuth({ action: item.authAction || "acceder a esta sección" });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
      <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
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
  );
};
