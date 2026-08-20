import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, Trash2, MoreHorizontal, ChevronDown, ChevronUp, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  EventComment,
  useCommentReplies,
  useReplyCount,
  useLikeComment,
  useUnlikeComment,
} from "@/hooks/useEventComments";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { ReportSheet } from "@/components/moderation/ReportSheet";

interface CommentItemProps {
  comment: EventComment;
  eventId: string;
  eventCreatorId?: string;
  isReply?: boolean;
  onReply?: (commentId: string, username: string) => void;
  onDelete: (commentId: string, parentId?: string | null) => void;
}

export const CommentItem = ({
  comment,
  eventId,
  eventCreatorId,
  isReply = false,
  onReply,
  onDelete,
}: CommentItemProps) => {
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: replyCount = 0 } = useReplyCount(!isReply ? comment.id : undefined);
  const { data: replies = [] } = useCommentReplies(
    !isReply && replyCount > 0 ? comment.id : undefined,
    eventId
  );

  const inlineReplies = replies.slice(0, 2);
  const extraReplies = replies.slice(2);
  const hasMore = replyCount > 2;

  const isOwner = user?.id === comment.user_id;
  const isCreator = user?.id === eventCreatorId;
  const canDelete = isOwner || isCreator;
  const canReport = !!user && !isOwner;

  const handleLikeToggle = () => {
    if (!user) {
      promptAuth({ action: "dar like a un comentario" });
      return;
    }
    if (comment.is_liked) {
      unlikeComment.mutate({ commentId: comment.id });
    } else {
      likeComment.mutate({ commentId: comment.id });
    }
  };

  const handleReply = () => {
    if (!user) {
      promptAuth({ action: "responder a un comentario" });
      return;
    }
    const targetId = comment.parent_id || comment.id;
    const username = comment.user?.username || "usuario";
    onReply?.(targetId, username);
  };

  const showMenu = canDelete || canReport;

  return (
    <div>
      <div className={`flex items-start gap-3 ${isReply ? "ml-10" : ""}`}>
        <Avatar
          className={`${isReply ? "w-6 h-6" : "w-8 h-8"} shrink-0 cursor-pointer`}
          onClick={() => navigate(`/user/${comment.user_id}`)}
        >
          <AvatarImage src={comment.user?.avatar_url || DEFAULT_AVATAR} />
          <AvatarFallback />
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm text-foreground cursor-pointer transition-colors font-medium" onClick={() => navigate(`/user/${comment.user_id}`)}
            >
              {comment.user?.username || "usuario"}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed break-words">
            {comment.content}
          </p>

          <div className="flex items-center gap-4 mt-1.5">
            <button
              onClick={handleLikeToggle}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors" >
              <Heart
                className={`w-3.5 h-3.5 ${
                  comment.is_liked ? "fill-brand-red text-brand-red" : "" }`}
              />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
            </button>

            {!isReply && (
              <button
                onClick={handleReply}
                className="text-xs text-muted-foreground transition-colors font-medium" >
                Responder
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full transition-colors opacity-40 ">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id, comment.parent_id)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10" >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar comentario
                  </DropdownMenuItem>
                )}
                {canDelete && canReport && <DropdownMenuSeparator />}
                {canReport && (
                  <DropdownMenuItem onClick={() => setReportOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    Reportar comentario
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!isReply && inlineReplies.length > 0 && (
        <div className="mt-2 space-y-3">
          {inlineReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              eventId={eventId}
              eventCreatorId={eventCreatorId}
              isReply
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {!isReply && hasMore && (
        <button
          onClick={() => setShowAllReplies(!showAllReplies)}
          className="ml-[52px] mt-2 flex items-center gap-1 text-xs text-primary font-medium" >
          {showAllReplies ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Ocultar respuestas
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Ver {replyCount - 2} {replyCount - 2 === 1 ? "respuesta más" : "respuestas más"}
            </>
          )}
        </button>
      )}

      {showAllReplies && extraReplies.length > 0 && (
        <div className="mt-2 space-y-3">
          {extraReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              eventId={eventId}
              eventCreatorId={eventCreatorId}
              isReply
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="comment" targetId={comment.id}
      />
    </div>
  );
};
