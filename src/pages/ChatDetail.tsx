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
import { useKeyboardAdjust } from "@/hooks/useKeyboardAdjust";

const ChatDetail = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isVisible: isKeyboardVisible } = useKeyboardAdjust();
  
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
    if (!chatId) {
      toast.error("No se puede enviar invitación - no hay chat seleccionado");
      return;
    }
    
    sendMessage.mutate(
      {
        chatId,
        content: "¡Mira este evento!",
        messageType: "event_invite",
        eventId,
      },
      {
        onSuccess: () => {
          toast.success("¡Invitación al evento enviada!");
        },
        onError: (error) => {
          console.error("Failed to send event invite:", error);
          toast.error("Error al enviar invitación");
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
        name: chatDetails.event.title || "Chat del Evento",
        avatar: chatDetails.event.image_url,
        subtitle: `${chatDetails.participants.length} miembros`,
      };
    }
    
    return {
      name: chatDetails.name || "Chat Grupal",
      avatar: null,
      subtitle: `${chatDetails.participants.length} miembros`,
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
        <p className="text-muted-foreground">Chat no encontrado</p>
        <Button variant="ghost" onClick={() => navigate("/chats")}>
          Volver a Mensajes
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 z-40 glass-strong safe-top">
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
            <p className="text-muted-foreground text-sm">Sin mensajes aún</p>
            <p className="text-muted-foreground text-xs mt-1">
              Envía un mensaje para iniciar la conversación
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`shrink-0 p-4 glass-strong ${isKeyboardVisible ? "pb-2" : "safe-bottom"}`}>
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
            placeholder="Escribe un mensaje..."
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
