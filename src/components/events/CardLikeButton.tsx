import { Heart } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPromptSafe } from "@/hooks/useAuthPrompt";
import {
  useEventLikes,
  useIsEventLiked,
  useLikeEvent,
  useUnlikeEvent,
} from "@/hooks/useEventLikes";

interface CardLikeButtonProps {
  eventId: string;
}

export const CardLikeButton = ({ eventId }: CardLikeButtonProps) => {
  const { user } = useAuth();
  const authPrompt = useAuthPromptSafe();
  const { data: liked = false } = useIsEventLiked(eventId);
  const { data: count = 0 } = useEventLikes(eventId);
  const likeMut = useLikeEvent();
  const unlikeMut = useUnlikeEvent();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      authPrompt?.promptAuth({ action: "dar like a esta publicación" });
      return;
    }
    if (liked) unlikeMut.mutate(eventId);
    else likeMut.mutate(eventId);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={liked ? "Quitar like" : "Dar like"}
      className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-1 py-0.5 [-webkit-tap-highlight-color:transparent] active:scale-95 transition-transform"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-colors",
          liked ? "fill-primary text-primary" : "text-white"
        )}
      />
      {count > 0 && (
        <span className="text-[11px] font-medium text-white leading-none">
          {formatCount(count)}
        </span>
      )}
    </button>
  );
};
