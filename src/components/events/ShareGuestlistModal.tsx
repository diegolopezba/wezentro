import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutualFollowers, useCreatePrivateChat, useSendMessage } from "@/hooks/useChats";
import { useEventGuestlist } from "@/hooks/useEvents";
import { Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

interface ShareGuestlistModalProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareGuestlistModal({ eventId, open, onOpenChange }: ShareGuestlistModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { data: mutualFollowers = [], isLoading: loadingFollowers } = useMutualFollowers();
  const { data: guestlist = [], isLoading: loadingGuestlist } = useEventGuestlist(eventId);
  const createPrivateChat = useCreatePrivateChat();
  const sendMessage = useSendMessage();

  // Get IDs of users already on the guestlist
  const guestlistUserIds = new Set(guestlist.map((entry: any) => entry.user_id));

  // Filter out users already on the guestlist
  const availableFollowers = mutualFollowers.filter(
    (user) => !guestlistUserIds.has(user.id)
  );

  const filteredFollowers = availableFollowers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select at least one person to invite");
      return;
    }

    setIsSending(true);
    let successCount = 0;

    try {
      for (const userId of selectedUsers) {
        const chatId = await createPrivateChat.mutateAsync(userId);
        await sendMessage.mutateAsync({
          chatId,
          content: "You're invited to join the guestlist!",
          messageType: "guestlist_invite",
          eventId,
        });
        successCount++;
      }

      toast.success(`Guestlist invite sent to ${successCount} ${successCount === 1 ? "person" : "people"}`);
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to send some invitations");
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = loadingFollowers || loadingGuestlist;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-brand flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Invite to Guestlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search mutual followers..."
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
            ) : filteredFollowers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-muted-foreground text-sm">
                  {searchQuery 
                    ? "No matching followers found" 
                    : availableFollowers.length === 0 
                      ? "All your mutual followers are already on the guestlist!"
                      : "No mutual followers yet"
                  }
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  You can only invite people who follow you back
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFollowers.map((user) => (
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
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
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

          {/* Send button */}
          <Button
            variant="hero"
            className="w-full"
            onClick={handleSend}
            disabled={selectedUsers.length === 0 || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            Invite {selectedUsers.length} {selectedUsers.length === 1 ? "person" : "people"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
