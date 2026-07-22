import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useUserFollowers, useUserFollowing, useIsFollowing, useIsFollowedBy, useFollowUser, useUnfollowUser, FollowUser } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { haptic } from "@/lib/haptics";
interface FollowersSheetProps {
  userId: string;
  type: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const FollowButton = ({
  targetUserId
}: {
  targetUserId: string;
}) => {
  const {
    user
  } = useAuth();
  const {
    data: isFollowing,
    isLoading
  } = useIsFollowing(targetUserId);
  const { data: isFollowedBy } = useIsFollowedBy(targetUserId);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  if (user?.id === targetUserId) return null;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("medium");
    if (isFollowing) {
      unfollowMutation.mutate(targetUserId);
    } else {
      followMutation.mutate(targetUserId);
    }
  };
  const isPending = followMutation.isPending || unfollowMutation.isPending;
  return <Button variant={isFollowing ? "secondary" : "hero"} size="sm" onClick={handleClick} disabled={isLoading || isPending} className="min-w-[100px] px-2 text-xs">
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="truncate">
          {isFollowing ? "Siguiendo" : isFollowedBy ? "Seguir de vuelta" : "Seguir"}
        </span>}
    </Button>;
};
const UserItem = ({
  user,
  onClose
}: {
  user: FollowUser;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  return <m.div initial={{
    opacity: 0,
    x: -10
  }} animate={{
    opacity: 1,
    x: 0
  }} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-primary-foreground px-0 py-0" onClick={() => {
    onClose();
    navigate(`/user/${user.id}`);
  }}>
      <img src={user.avatar_url || DEFAULT_AVATAR} alt={user.username} className="w-12 h-12 rounded-full object-cover bg-secondary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{user.full_name || user.username}</p>
        <p className="text-sm text-muted-foreground truncate">{user.username}</p>
      </div>
      <FollowButton targetUserId={user.id} />
    </m.div>;
};
export const FollowersSheet = ({
  userId,
  type,
  open,
  onOpenChange
}: FollowersSheetProps) => {
  const {
    data: followers,
    isLoading: followersLoading
  } = useUserFollowers(type === "followers" ? userId : undefined);
  const {
    data: following,
    isLoading: followingLoading
  } = useUserFollowing(type === "following" ? userId : undefined);
  const users = type === "followers" ? followers : following;
  const isLoading = type === "followers" ? followersLoading : followingLoading;
  const title = type === "followers" ? "Seguidores" : "Siguiendo";
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-brand text-xl">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 overflow-y-auto h-[calc(100%-60px)] pb-8">
          {isLoading ? <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div> : !users || users.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              {type === "followers" ? "Sin seguidores aún" : "No sigue a nadie aún"}
            </div> : users.map(user => <UserItem key={user.id} user={user} onClose={() => onOpenChange(false)} />)}
        </div>
      </SheetContent>
    </Sheet>;
};