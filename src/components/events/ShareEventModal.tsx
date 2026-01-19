import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutualFollowers, useCreatePrivateChat, useSendMessage } from "@/hooks/useChats";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useUserSubscription } from "@/hooks/useSubscription";
import { Loader2, Search, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface ShareEventModalProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareEventModal({ eventId, open, onOpenChange }: ShareEventModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { data: subscription } = useUserSubscription();
  const isBusinessUser = subscription?.plan_type === 'business_premium';

  const { data: mutualFollowers = [], isLoading: loadingFollowers } = useMutualFollowers();
  const { data: searchResults = [], isLoading: loadingSearch } = useSearchUsers(
    isBusinessUser ? searchQuery : ""
  );
  const createPrivateChat = useCreatePrivateChat();
  const sendMessage = useSendMessage();

  // Business users search all users; regular users filter mutual followers
  const baseUsers = isBusinessUser && searchQuery.length >= 2
    ? searchResults
    : mutualFollowers.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
  const isLoading = isBusinessUser ? loadingSearch : loadingFollowers;

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Selecciona al menos una persona");
      return;
    }

    setIsSending(true);
    let successCount = 0;

    try {
      for (const userId of selectedUsers) {
        const chatId = await createPrivateChat.mutateAsync(userId);
        await sendMessage.mutateAsync({
          chatId,
          content: "¡Mira este evento!",
          messageType: "event_invite",
          eventId,
        });
        successCount++;
      }

      toast.success(`Evento enviado a ${successCount} ${successCount === 1 ? "persona" : "personas"}`);
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al enviar algunas invitaciones");
    } finally {
      setIsSending(false);
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/event/${eventId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "¡Mira este evento en Zentro!",
          text: "Encontré este evento increíble y pensé que te gustaría!",
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== "AbortError") {
          toast.error("Error al compartir");
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("¡Enlace copiado!");
      } catch {
        toast.error("Error al copiar enlace");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-brand">Enviar evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isBusinessUser ? "Buscar usuarios..." : "Buscar seguidores mutuos..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Followers list */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : baseUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-muted-foreground text-sm">
                  {isBusinessUser 
                    ? (searchQuery.length < 2 ? "Escribe para buscar usuarios" : "No se encontraron usuarios")
                    : (searchQuery ? "No se encontraron seguidores" : "Aún no tienes seguidores mutuos")}
                </p>
                {!isBusinessUser && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Solo puedes enviar eventos a personas que te siguen de vuelta
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {baseUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || DEFAULT_AVATAR} />
                      <AvatarFallback />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        @{user.username}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Send button with native share */}
          <div className="flex gap-2">
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSend}
              disabled={selectedUsers.length === 0 || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar a {selectedUsers.length} {selectedUsers.length === 1 ? "persona" : "personas"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={handleNativeShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
