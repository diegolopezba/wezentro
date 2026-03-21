import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SearchUser } from "@/hooks/useSearchUsers";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface UserSearchResultCardProps {
  user: SearchUser;
  onClick?: () => void;
}

export const UserSearchResultCard = ({ user, onClick }: UserSearchResultCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    navigate(`/user/${user.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url || DEFAULT_AVATAR} alt={user.full_name || user.username} />
        <AvatarFallback />
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {user.full_name || user.username}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          @{user.username}
        </p>
      </div>
    </button>
  );
};
