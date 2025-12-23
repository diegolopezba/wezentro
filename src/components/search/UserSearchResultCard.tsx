import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import type { SearchUser } from "@/hooks/useSearchUsers";

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
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.username} />
        <AvatarFallback className="bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </AvatarFallback>
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
