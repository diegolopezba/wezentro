import { useState } from "react";
import { MoreHorizontal, Share2, Copy, Send, Flag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { BlockUserDialog } from "@/components/moderation/BlockUserDialog";
import { useNavigate } from "react-router-dom";

interface ShareProfileMenuProps {
  userId: string;
  username: string;
}

export const ShareProfileMenu = ({ userId, username }: ShareProfileMenuProps) => {
  const profileUrl = `${window.location.origin}/user/${userId}`;
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Enlace copiado al portapapeles");
    } catch {
      toast.error("Error al copiar el enlace");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} en Zentro`,
          text: `Mira el perfil de @${username} en Zentro`,
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Error al compartir");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const requireAuth = (action: string, fn: () => void) => {
    if (!user) {
      promptAuth({ action });
      return;
    }
    fn();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartir perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar enlace
          </DropdownMenuItem>
          {!isOwnProfile && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => requireAuth("reportar a este usuario", () => setReportOpen(true))}
                className="text-foreground"
              >
                <Flag className="w-4 h-4 mr-2" />
                Reportar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => requireAuth("bloquear a este usuario", () => setBlockOpen(true))}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquear
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="profile"
        targetId={userId}
      />
      <BlockUserDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        userId={userId}
        username={username}
        onBlocked={() => navigate("/")}
      />
    </>
  );
};
