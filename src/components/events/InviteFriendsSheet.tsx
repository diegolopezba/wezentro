import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutualFollowers } from "@/hooks/useChats";
import { useEventGuestlist } from "@/hooks/useEvents";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useSendGuestlistInvitations, useEventInvitations } from "@/hooks/useGuestlistInvitations";
import { Loader2, Search, Users, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface InviteFriendsSheetProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFriendsSheet({ eventId, eventTitle, open, onOpenChange }: InviteFriendsSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { profile } = useAuth();
  const isBusinessUser = profile?.is_business === true;

  const { data: mutualFollowers = [], isLoading: loadingFollowers } = useMutualFollowers();
  const { data: searchResults = [], isLoading: loadingSearch } = useSearchUsers(
    isBusinessUser ? searchQuery : "" );
  const { data: guestlist = [] } = useEventGuestlist(eventId);
  const { data: existingInvitations = [] } = useEventInvitations(eventId);
  const sendInvitations = useSendGuestlistInvitations();

  const guestlistUserIds = new Set(guestlist.map((entry: any) => entry.user_id));
  const invitedUserIds = new Set(existingInvitations.map((inv) => inv.invited_user_id));

  const baseUsers = isBusinessUser && searchQuery.length >= 2
    ? searchResults.filter((user) => !guestlistUserIds.has(user.id) && !invitedUserIds.has(user.id))
    : mutualFollowers
        .filter((user) => !guestlistUserIds.has(user.id) && !invitedUserIds.has(user.id))
        .filter((user) =>
          searchQuery.length === 0 ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const isLoading = isBusinessUser ? loadingSearch : loadingFollowers;

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) return;
    try {
      await sendInvitations.mutateAsync({ eventId, userIds: selectedUsers });
      toast.success(`Invitación enviada a ${selectedUsers.length} ${selectedUsers.length === 1 ? "persona" : "personas"}`);
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast.error("Algunos usuarios ya fueron invitados");
      } else {
        toast.error("Error al enviar invitaciones");
      }
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    onOpenChange(false);
  };

  // Confetti particles
  const confettiRef = useRef<HTMLDivElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const confettiColors = [ "hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#f97316",
  ];

  const confettiParticles = Array.from({ length: 30 }, (_, i) => {
    const color = confettiColors[i % confettiColors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.2 + Math.random() * 0.8;
    const rotation = Math.random() * 360;
    const xDrift = (Math.random() - 0.5) * 120;
    const size = 4 + Math.random() * 4;
    const isCircle = Math.random() > 0.5;

    return (
      <span
        key={i}
        className="absolute pointer-events-none" style={{
          left: `${left}%`,
          top: "-8px",
          width: `${size}px`,
          height: isCircle ? `${size}px` : `${size * 2.5}px`,
          borderRadius: isCircle ? "50%" : "2px",
          backgroundColor: color,
          opacity: showConfetti ? 1 : 0,
          transform: `rotate(${rotation}deg)`,
          animation: showConfetti
            ? `confetti-fall ${duration}s ease-out ${delay}s forwards` : "none",
          // @ts-ignore "--x-drift": `${xDrift}px`,
        } as React.CSSProperties}
      />
    );
  });

  return (
    <>
      <style>{` @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(350px) translateX(var(--x-drift, 0px)) rotate(720deg) scale(0.5);
          }
        } `}</style>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] overflow-hidden">
          {/* Confetti container */}
          {showConfetti && (
            <div ref={confettiRef} className="absolute inset-x-0 top-0 h-full pointer-events-none z-10 overflow-hidden">
              {confettiParticles}
            </div>
          )}

          <DrawerHeader className="text-center pb-2 relative z-20">
            <div className="flex justify-center mb-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                <PartyPopper className="w-7 h-7 text-primary" />
              </div>
            </div>
            <DrawerTitle className="font-brand text-xl">¡Estás dentro!</DrawerTitle>
            <DrawerDescription>
              Invita amigos a <span className="font-medium text-foreground">{eventTitle}</span>
            </DrawerDescription>
          </DrawerHeader>

        <div className="px-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isBusinessUser ? "Buscar usuarios..." : "Buscar seguidores mutuos..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9" />
          </div>

          {/* Users list */}
          <ScrollArea className="h-[240px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : baseUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-muted-foreground text-sm">
                  {isBusinessUser
                    ? searchQuery.length < 2 ? "Escribe para buscar usuarios" : "No se encontraron usuarios" : searchQuery
                      ? "No se encontraron seguidores" : "Aún no tienes seguidores mutuos" }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {baseUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" >
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
                        {user.username}
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
        </div>

        <DrawerFooter className="flex-row gap-3 relative z-20">
          <Button variant="ghost" className="flex-1" onClick={handleClose}>
            Ahora no
          </Button>
          <Button
            variant="hero" className="flex-1" onClick={handleSend}
            disabled={selectedUsers.length === 0 || sendInvitations.isPending}
          >
            {sendInvitations.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            Invitar{selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ""}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    </>
  );
}
