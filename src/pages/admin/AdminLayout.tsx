import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Building2, Loader2, LogOut, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/useAdminApi";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "Overview", icon: BarChart3, end: true },
  { to: "/admin/payments", label: "Pagos", icon: Wallet },
  { to: "/admin/businesses", label: "Negocios", icon: Building2 },
];

const AdminLayout = () => {
  const { data, isLoading, isError } = useAdminSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Zentro Admin";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data?.ok) return <Navigate to="/admin/login" replace />;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      <aside className="w-56 shrink-0 border-r border-border hidden md:flex flex-col p-4 gap-1">
        <div className="px-3 py-4">
          <p className="text-sm font-medium">Zentro Admin</p>
          <p className="text-xs text-muted-foreground truncate">{data.email}</p>
        </div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
                isActive ? "bg-muted text-foreground" : "text-muted-foreground",
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        <nav className="md:hidden flex items-center gap-1 border-b border-border px-3 py-2 overflow-x-auto">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-full text-sm whitespace-nowrap",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <button onClick={signOut} className="ml-auto px-3 py-1.5 text-sm text-muted-foreground">
            Salir
          </button>
        </nav>
        <main className="p-4 md:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
