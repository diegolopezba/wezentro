import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Send, Loader2, MessageCircle, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEventComments, useAddComment, useDeleteComment } from "@/hooks/useEventComments";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface CommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventCreatorId?: string;
  commentCount?: number;
}

export const CommentsSheet = ({
  open,
  onOpenChange,
  eventId,
  eventCreatorId,
  commentCount = 0,
}: CommentsSheetProps) => {
  const { user } = useAuth();
  const { data: currentProfile } = useUserProfile(user?.id);
  const { promptAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading } = useEventComments(open ? eventId : undefined);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) {
      promptAuth({ action: "comentar en esta publicación" });
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await addComment.mutateAsync({ eventId, content: trimmed });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputFocus = () => {
    if (!user) {
      promptAuth({ action: "comentar en esta publicación" });
    }
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate({ commentId, eventId });
  };

  const totalCount = comments.length || commentCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col p-0 rounded-t-3xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-5 pb-3 shrink-0 border-b border-border/50">
          <SheetTitle className="text-base font-semibold text-foreground">
            Comentarios{totalCount > 0 ? ` (${totalCount})` : ""}
          </SheetTitle>
        </SheetHeader>

        {/* Comments list */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Sé el primero en comentar</p>
              <p className="text-xs text-muted-foreground">Comparte tu opinión sobre esta publicación</p>
            </div>
          ) : (
            <div className="py-3 space-y-5">
              {comments.map((comment) => {
                const isOwner = user?.id === comment.user_id;
                const isCreator = user?.id === eventCreatorId;
                const canDelete = isOwner || isCreator;

                return (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Avatar
                      className="w-8 h-8 shrink-0 cursor-pointer"
                      onClick={() => navigate(`/user/${comment.user_id}`)}
                    >
                      <AvatarImage src={comment.user?.avatar_url || DEFAULT_AVATAR} />
                      <AvatarFallback />
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm text-foreground cursor-pointer hover:text-primary transition-colors font-medium"
                          onClick={() => navigate(`/user/${comment.user_id}`)}
                        >
                          @{comment.user?.username || "usuario"}
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
                    </div>

                    {canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors opacity-40 hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => handleDelete(comment.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar comentario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border/50 px-4 py-3 safe-bottom">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={currentProfile?.avatar_url || DEFAULT_AVATAR} />
              <AvatarFallback />
            </Avatar>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Añade un comentario…"
              maxLength={500}
              className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="hero"
              disabled={!text.trim() || addComment.isPending}
              className="shrink-0"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
