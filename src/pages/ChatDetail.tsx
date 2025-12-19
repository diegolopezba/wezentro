import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MoreVertical, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatDetails, useChatMessages, useSendMessage, useMarkChatAsRead } from "@/hooks/useChats";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import MessageBubble from "@/components/chat/MessageBubble";
import EventPickerModal from "@/components/chat/EventPickerModal";
import { toast } from "sonner";

const ChatDetail = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState("");
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: chatDetails, isLoading: chatLoading } = useChatDetails(chatId);
  const { data: messages, isLoading: messagesLoading } = useChatMessages(chatId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkChatAsRead();

  // Mark chat as read when opening
  useEffect(() => {
    if (chatId && chatDetails) {
      markAsRead.mutate(chatId);
    }
  }, [chatId, chatDetails]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  const handleSend = () => {
    if (!message.trim() || !chatId) return;
    
    sendMessage.mutate({
      chatId,
      content: message.trim(),
      messageType: "text",
    });
    setMessage("");
  };

  const handleSendEventInvite = (eventId: string) => {
    console.log("handleSendEventInvite called with:", { chatId, eventId });
    
    if (!chatId) {
      console.error("No chatId available");
      toast.error("Cannot send invite - no chat selected");
      return;
    }
    
    sendMessage.mutate(
      {
        chatId,
        content: "Check out this event!",
        messageType: "event_invite",
        eventId,
      },
      {
        onSuccess: () => {
          console.log("Event invite sent successfully");
          toast.success("Event invitation sent!");
        },
        onError: (error) => {
          console.error("Failed to send event invite:", error);
          toast.error("Failed to send invitation");
        },
      }
    );
  };

  const handleHeaderClick = () => {
    if (chatDetails?.type === "private" && chatDetails.otherParticipant) {
      navigate(`/user/${chatDetails.otherParticipant.id}`);
    } else if (chatDetails?.event) {
      navigate(`/event/${chatDetails.event.id}`);
    }
  };

  // Get display info for header
  const getHeaderInfo = () => {
    if (!chatDetails) return { name: "", avatar: "", subtitle: "" };
    
    if (chatDetails.type === "private" && chatDetails.otherParticipant) {
      return {
        name: chatDetails.otherParticipant.full_name || chatDetails.otherParticipant.username,
        avatar: chatDetails.otherParticipant.avatar_url,
        subtitle: `@${chatDetails.otherParticipant.username}`,
      };
    }
    
    if (chatDetails.event) {
      return {
        name: chatDetails.event.title || "Event Chat",
        avatar: chatDetails.event.image_url,
        subtitle: `${chatDetails.participants.length} members`,
      };
    }
    
    return {
      name: chatDetails.name || "Group Chat",
      avatar: null,
      subtitle: `${chatDetails.participants.length} members`,
    };
  };

  const headerInfo = getHeaderInfo();

  if (chatLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chatDetails) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Chat not found</p>
        <Button variant="ghost" onClick={() => navigate("/chats")}>
          Back to Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chats")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={handleHeaderClick}
          >
            {headerInfo.avatar ? (
              <img
                src={headerInfo.avatar}
                alt={headerInfo.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-lg font-semibold text-muted-foreground">
                  {headerInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-semibold text-foreground">{headerInfo.name}</h1>
              <p className="text-xs text-muted-foreground">{headerInfo.subtitle}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.id} message={msg} index={index} />
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs mt-1">
              Send a message to start the conversation
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 p-4 glass-strong safe-bottom">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEventPickerOpen(true)}
            className="flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button
            variant="hero"
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Event Picker Modal */}
      <EventPickerModal
        open={eventPickerOpen}
        onOpenChange={setEventPickerOpen}
        onSelectEvent={handleSendEventInvite}
      />
    </div>
  );
};

export default ChatDetail;
