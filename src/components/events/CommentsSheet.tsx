import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEventComments, useAddComment, useDeleteComment } from "@/hooks/useEventComments";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { CommentItem } from "./CommentItem";
import { haptic } from "@/lib/haptics";

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
  const { data: currentProfile } = useUserProfile(user?.id, true);
  const { promptAuth } = useAuthPrompt();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ parentId: string; username: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading } = useEventComments(open ? eventId : undefined);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  useEffect(() => {
    if (comments.length > 0) {
      requestAnimationFrame(() => {
        const list = listRef.current;
        if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      });
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
    const parentId = replyingTo?.parentId || null;
    setReplyingTo(null);
    haptic("light");
    await addComment.mutateAsync({ eventId, content: trimmed, parentId });
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    });
  };

  const handleInputFocus = () => {
    if (!user) {
      promptAuth({ action: "comentar en esta publicación" });
    }
  };

  const handleDelete = (commentId: string, parentId?: string | null) => {
    deleteComment.mutate({ commentId, eventId, parentId });
  };

  const handleReply = (parentId: string, username: string) => {
    setReplyingTo({ parentId, username });
    inputRef.current?.focus();
  };

  const totalCount = comments.length || commentCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-3xl" >

        <SheetHeader className="px-5 pb-3 shrink-0 border-b border-border/50">
          <SheetTitle className="text-base font-semibold text-foreground">
            Comentarios{totalCount > 0 ? ` (${totalCount})` : ""}
          </SheetTitle>
        </SheetHeader>

        {/* Comments list */}
        <div ref={listRef} data-vaul-no-drag className="sheet-scroll-region flex-1 px-4">
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
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  eventId={eventId}
                  eventCreatorId={eventCreatorId}
                  onReply={handleReply}
                  onDelete={handleDelete}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="shrink-0 px-4 py-2 border-t border-border/30 flex items-center justify-between bg-muted/50">
            <span className="text-xs text-muted-foreground">
              Respondiendo a <span className="font-medium text-foreground">@{replyingTo.username}</span>
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-0.5 rounded-full transition-colors" >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div data-vaul-no-drag className="shrink-0 border-t border-border/50 px-4 py-3 safe-bottom">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={currentProfile?.avatar_url || DEFAULT_AVATAR} />
              <AvatarFallback />
            </Avatar>
            <input
              ref={inputRef}
              type="text" value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={replyingTo ? `Responder a @${replyingTo.username}…` : "Añade un comentario…"}
              maxLength={500}
              className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
            <Button
              type="submit" size="icon-sm" variant="hero" disabled={!text.trim() || addComment.isPending}
              className="shrink-0" >
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
