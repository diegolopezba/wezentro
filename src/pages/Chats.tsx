import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserChats, ChatWithDetails } from "@/hooks/useChats";
import { useAuth } from "@/contexts/AuthContext";
import { NewChatModal } from "@/components/chat/NewChatModal";

const Chats = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: chats, isLoading } = useUserChats();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const getChatAvatar = (chat: ChatWithDetails) => {
    if (chat.type === "private") {
      const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
      return otherParticipant?.avatar_url;
    }
    return chat.event?.image_url;
  };

  const getChatDisplayName = (chat: ChatWithDetails) => {
    if (chat.type === "private") {
      const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
      return otherParticipant?.full_name || otherParticipant?.username || "Unknown";
    }
    return chat.name || chat.event?.title || "Group Chat";
  };

  const getOtherParticipantId = (chat: ChatWithDetails) => {
    if (chat.type === "private") {
      const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
      return otherParticipant?.id;
    }
    return null;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    return formatDistanceToNow(new Date(dateString), { addSuffix: false });
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">
            Messages
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setNewChatOpen(true)}
            className="rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Chat list */}
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !chats || chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Start a conversation with someone you both follow
            </p>
            <Button
              onClick={() => setNewChatOpen(true)}
              className="mt-4"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        ) : (
          chats.map((chat, index) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/chats/${chat.id}`)}
              className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors hover:bg-muted/30 px-0"
            >
              <div
                className="relative"
                onClick={(e) => {
                  if (chat.type === "private") {
                    e.stopPropagation();
                    const otherUserId = getOtherParticipantId(chat);
                    if (otherUserId) {
                      navigate(`/user/${otherUserId}`);
                    }
                  }
                }}
              >
                <Avatar className={`w-14 h-14 ${chat.type === "private" ? "cursor-pointer hover:scale-105 transition-transform" : ""}`}>
                  <AvatarImage
                    src={getChatAvatar(chat) || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {getChatDisplayName(chat)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {chat.type === "event" && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px]">🎉</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {getChatDisplayName(chat)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(chat.lastMessage?.created_at || chat.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {chat.lastMessage?.content || "No messages yet"}
                </p>
              </div>

              {chat.unreadCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {chat.unreadCount}
                  </span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <NewChatModal open={newChatOpen} onOpenChange={setNewChatOpen} />
    </AppLayout>
  );
};

export default Chats;
