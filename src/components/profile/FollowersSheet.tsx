import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useUserFollowers, useUserFollowing, useIsFollowing, useFollowUser, useUnfollowUser, FollowUser } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";

interface FollowersSheetProps {
  userId: string;
  type: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FollowButton = ({ targetUserId }: { targetUserId: string }) => {
  const { user } = useAuth();
  const { data: isFollowing, isLoading } = useIsFollowing(targetUserId);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  if (user?.id === targetUserId) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      unfollowMutation.mutate(targetUserId);
    } else {
      followMutation.mutate(targetUserId);
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={isFollowing ? "secondary" : "hero"}
      size="sm"
      onClick={handleClick}
      disabled={isLoading || isPending}
      className="min-w-[80px]"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-3 h-3 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-3 h-3 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
};

const UserItem = ({ user, onClose }: { user: FollowUser; onClose: () => void }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
      onClick={() => {
        onClose();
        navigate(`/user/${user.id}`);
      }}
    >
      <img
        src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
        alt={user.username}
        className="w-12 h-12 rounded-full object-cover bg-secondary"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {user.full_name || user.username}
        </p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>
      <FollowButton targetUserId={user.id} />
    </motion.div>
  );
};

export const FollowersSheet = ({ userId, type, open, onOpenChange }: FollowersSheetProps) => {
  const { data: followers, isLoading: followersLoading } = useUserFollowers(type === "followers" ? userId : undefined);
  const { data: following, isLoading: followingLoading } = useUserFollowing(type === "following" ? userId : undefined);

  const users = type === "followers" ? followers : following;
  const isLoading = type === "followers" ? followersLoading : followingLoading;
  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-brand text-xl">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 overflow-y-auto h-[calc(100%-60px)] pb-8">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </div>
          ) : (
            users.map((user) => (
              <UserItem key={user.id} user={user} onClose={() => onOpenChange(false)} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
