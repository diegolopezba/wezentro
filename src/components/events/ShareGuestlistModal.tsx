import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutualFollowers } from "@/hooks/useChats";
import { useEventGuestlist } from "@/hooks/useEvents";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useUserSubscription } from "@/hooks/useSubscription";
import { useSendGuestlistInvitations, useEventInvitations } from "@/hooks/useGuestlistInvitations";
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

  const { data: subscription } = useUserSubscription();
  const isBusinessUser = subscription?.plan_type === 'business_premium';

  const { data: mutualFollowers = [], isLoading: loadingFollowers } = useMutualFollowers();
  const { data: searchResults = [], isLoading: loadingSearch } = useSearchUsers(
    isBusinessUser ? searchQuery : ""
  );
  const { data: guestlist = [], isLoading: loadingGuestlist } = useEventGuestlist(eventId);
  const { data: existingInvitations = [] } = useEventInvitations(eventId);
  const sendInvitations = useSendGuestlistInvitations();

  // Get IDs of users already on the guestlist or already invited
  const guestlistUserIds = new Set(guestlist.map((entry: any) => entry.user_id));
  const invitedUserIds = new Set(existingInvitations.map((inv) => inv.invited_user_id));

  // Business users search all users; regular users filter mutual followers
  const baseUsers = isBusinessUser && searchQuery.length >= 2
    ? searchResults.filter((user) => !guestlistUserIds.has(user.id) && !invitedUserIds.has(user.id))
    : mutualFollowers
        .filter((user) => !guestlistUserIds.has(user.id) && !invitedUserIds.has(user.id))
        .filter((user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const isLoading = isBusinessUser 
    ? (loadingSearch || loadingGuestlist) 
    : (loadingFollowers || loadingGuestlist);

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

    try {
      await sendInvitations.mutateAsync({
        eventId,
        userIds: selectedUsers,
      });

      toast.success(`Invitation sent to ${selectedUsers.length} ${selectedUsers.length === 1 ? "person" : "people"}`);
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast.error("Some users were already invited");
      } else {
        toast.error("Failed to send invitations");
      }
    }
  };

  // Count available mutual followers (excluding those on guestlist)
  const availableFollowersCount = mutualFollowers.filter(u => !guestlistUserIds.has(u.id)).length;
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
              placeholder={isBusinessUser ? "Search users..." : "Search mutual followers..."}
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
                    ? (searchQuery.length < 2 ? "Type to search for any user" : "No users found")
                    : (searchQuery 
                        ? "No matching followers found" 
                        : availableFollowersCount === 0 
                          ? "All your mutual followers are already on the guestlist!"
                          : "No mutual followers yet"
                      )
                  }
                </p>
                {!isBusinessUser && (
                  <p className="text-muted-foreground text-xs mt-1">
                    You can only invite people who follow you back
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
            disabled={selectedUsers.length === 0 || sendInvitations.isPending}
          >
            {sendInvitations.isPending ? (
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
