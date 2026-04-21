import { m } from "framer-motion";
import { ArrowLeft, Ban, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useBlockedUsersList, useUnblockUser } from "@/hooks/useBlockedUsers";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const BlockedUsers = () => {
  const navigate = useNavigate();
  const { data: blocked, isLoading } = useBlockedUsersList();
  const unblock = useUnblockUser();

  return (
    <AppLayout>
      <header className="sticky top-0 z-40 safe-top bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-semibold text-foreground">Usuarios bloqueados</h1>
        </div>
      </header>

      <div className="px-4 py-2 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !blocked || blocked.length === 0 ? (
          <div className="text-center py-16">
            <Ban className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No has bloqueado a nadie</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Las personas que bloquees aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {blocked.map((b, idx) => (
              <m.div
                key={b.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-3"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={b.blocked?.avatar_url || DEFAULT_AVATAR} />
                  <AvatarFallback />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{b.blocked?.username || "usuario"}
                  </p>
                  {b.blocked?.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{b.blocked.full_name}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={unblock.isPending}
                  onClick={() => unblock.mutate(b.blocked_id)}
                >
                  Desbloquear
                </Button>
              </m.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BlockedUsers;
