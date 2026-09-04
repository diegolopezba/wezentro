import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  User, Bookmark, Shield, Ban, Gift, Briefcase, BarChart3, HelpCircle, Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";

interface MenuItem {
  icon: typeof User;
  label: string;
  path: string;
  matchPrefix?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/**
 * Desktop-only settings shell: a persistent vertical menu pinned next to the
 * desktop nav rail, with the page content on the right (dashboard pattern).
 * On mobile it renders children untouched.
 */
export const SettingsShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { isBusiness, hasPayouts } = useDashboardAccess();

  const groups: MenuGroup[] = [
    {
      title: "Cuenta",
      items: [
        { icon: SettingsIcon, label: "General", path: "/settings" },
        { icon: User, label: "Mi perfil", path: "/edit-profile" },
        { icon: Bookmark, label: "Guardados", path: "/saved" },
        { icon: Shield, label: "Privacidad", path: "/settings/privacy" },
        { icon: Ban, label: "Usuarios bloqueados", path: "/settings/blocks" },
        { icon: Gift, label: "Invitar amigos", path: "/settings/referrals" },
      ],
    },
    {
      title: "Business",
      items: [
        { icon: Briefcase, label: "Business", path: "/settings/business", matchPrefix: true },
        ...(isBusiness
          ? [{ icon: BarChart3, label: "Dashboard", path: "/dashboard" } as MenuItem]
          : []),
      ],
    },
    {
      title: "Soporte",
      items: [{ icon: HelpCircle, label: "Ayuda y soporte", path: "/settings/help" }],
    },
  ];

  const isActive = (item: MenuItem) =>
    item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path;

  void hasPayouts;

  return (
    <div className="lg:pl-[21rem]">
      <aside className="hidden lg:flex fixed left-20 top-0 bottom-0 z-30 w-64 flex-col gap-5 overflow-y-auto border-r border-border bg-background px-3 py-6">
        <p className="px-3 font-brand text-lg font-medium text-foreground">Configuración</p>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
            <nav className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:hover:bg-secondary",
                      active ? "bg-secondary text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </aside>
      {children}
    </div>
  );
};
