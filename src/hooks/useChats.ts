import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatParticipant {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ChatWithDetails {
  id: string;
  type: string;
  name: string | null;
  event_id: string | null;
  created_at: string | null;
  participants: ChatParticipant[];
  lastMessage: {
    content: string | null;
    created_at: string | null;
    sender_id: string | null;
  } | null;
  unreadCount: number;
  event?: {
    id: string;
    title: string | null;
    image_url: string | null;
  } | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: string | null;
  event_id: string | null;
  created_at: string | null;
  sender?: ChatParticipant | null;
  event?: {
    id: string;
    title: string | null;
    image_url: string | null;
    start_datetime: string;
    location_name: string | null;
    creator_id: string;
  } | null;
}

export interface MutualFollower {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Fetch all chats for current user with last message and participants
export const useUserChats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-chats", user?.id],
    queryFn: async (): Promise<ChatWithDetails[]> => {
      if (!user?.id) return [];

      // Get all chats where user is a participant, including last_read_at
      const { data: participations, error: partError } = await supabase
        .from("chat_participants")
        .select("chat_id, last_read_at")
        .eq("user_id", user.id);

      if (partError) throw partError;
      if (!participations || participations.length === 0) return [];

      const chatIds = participations.map((p) => p.chat_id);
      
      // Create a map of chat_id to last_read_at for quick lookup
      const lastReadMap: Record<string, string | null> = {};
      participations.forEach((p) => {
        lastReadMap[p.chat_id] = p.last_read_at;
      });

      // Get chat details
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select(`
          id,
          type,
          name,
          event_id,
          created_at
        `)
        .in("id", chatIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (chatsError) throw chatsError;
      if (!chats) return [];

      // Get all participants for these chats
      const { data: allParticipants, error: allPartError } = await supabase
        .from("chat_participants")
        .select(`
          chat_id,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .in("chat_id", chatIds);

      if (allPartError) throw allPartError;

      // Get ALL messages for these chats to count unread
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("chat_id, content, created_at, sender_id")
        .in("chat_id", chatIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (msgError) throw msgError;

      // Get event details for event chats
      const eventIds = chats
        .filter((c) => c.event_id)
        .map((c) => c.event_id as string);

      let eventsMap: Record<string, { id: string; title: string | null; image_url: string | null }> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("id, title, image_url")
          .in("id", eventIds);

        if (events) {
          eventsMap = events.reduce((acc, e) => {
            acc[e.id] = e;
            return acc;
          }, {} as typeof eventsMap);
        }
      }

      // Build chat details
      const chatsWithDetails: ChatWithDetails[] = chats.map((chat) => {
        // Get participants for this chat (excluding current user for private chats)
        const chatParticipants = (allParticipants || [])
          .filter((p) => p.chat_id === chat.id)
          .map((p) => p.profiles as unknown as ChatParticipant)
          .filter((p): p is ChatParticipant => p !== null);

        // Get messages for this chat
        const chatMessages = (messages || []).filter((m) => m.chat_id === chat.id);
        const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;

        // Calculate unread count
        const lastReadAt = lastReadMap[chat.id];
        let unreadCount = 0;
        if (lastReadAt) {
          const lastReadTime = new Date(lastReadAt).getTime();
          unreadCount = chatMessages.filter((m) => {
            // Don't count own messages as unread
            if (m.sender_id === user.id) return false;
            const msgTime = m.created_at ? new Date(m.created_at).getTime() : 0;
            return msgTime > lastReadTime;
          }).length;
        }

        // For private chats, get the other participant
        const otherParticipants = chatParticipants.filter((p) => p.id !== user.id);

        return {
          id: chat.id,
          type: chat.type,
          name: chat.type === "private" && otherParticipants.length > 0
            ? otherParticipants[0].full_name || otherParticipants[0].username
            : chat.name,
          event_id: chat.event_id,
          created_at: chat.created_at,
          participants: chatParticipants,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_id: lastMessage.sender_id,
              }
            : null,
          unreadCount,
          event: chat.event_id ? eventsMap[chat.event_id] : null,
        };
      });

      // Sort by last message time
      return chatsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at || "";
        const bTime = b.lastMessage?.created_at || b.created_at || "";
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
    enabled: !!user?.id,
  });
};

// Mark chat as read by updating last_read_at
export const useMarkChatAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("chat_id", chatId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-chats"] });
    },
  });
};

// Fetch single chat details
export const useChatDetails = (chatId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-details", chatId],
    queryFn: async () => {
      if (!chatId) return null;

      const { data: chat, error } = await supabase
        .from("chats")
        .select(`
          id,
          type,
          name,
          event_id,
          created_at
        `)
        .eq("id", chatId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!chat) return null;

      // Get participants
      const { data: participants } = await supabase
        .from("chat_participants")
        .select(`
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("chat_id", chatId);

      const chatParticipants = (participants || [])
        .map((p) => p.profiles as unknown as ChatParticipant)
        .filter((p): p is ChatParticipant => p !== null);

      // For private chats, get the other participant
      const otherParticipants = chatParticipants.filter((p) => p.id !== user?.id);

      // Get event details if event chat
      let event = null;
      if (chat.event_id) {
        const { data: eventData } = await supabase
          .from("events")
          .select("id, title, image_url, start_datetime, location_name")
          .eq("id", chat.event_id)
          .maybeSingle();
        event = eventData;
      }

      return {
        ...chat,
        participants: chatParticipants,
        otherParticipant: chat.type === "private" ? otherParticipants[0] : null,
        event,
      };
    },
    enabled: !!chatId && !!user?.id,
  });
};

// Fetch messages for a chat
export const useChatMessages = (chatId: string | undefined) => {
  return useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: async (): Promise<Message[]> => {
      if (!chatId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          message_type,
          event_id,
          created_at,
          profiles:sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("chat_id", chatId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get event details for event_invite messages
      const eventIds = (data || [])
        .filter((m) => m.event_id)
        .map((m) => m.event_id as string);

      let eventsMap: Record<string, Message["event"]> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("id, title, image_url, start_datetime, location_name, creator_id")
          .in("id", eventIds);

        if (events) {
          eventsMap = events.reduce((acc, e) => {
            acc[e.id] = e;
            return acc;
          }, {} as typeof eventsMap);
        }
      }

      return (data || []).map((m) => ({
        id: m.id,
        chat_id: m.chat_id,
        sender_id: m.sender_id,
        content: m.content,
        message_type: m.message_type,
        event_id: m.event_id,
        created_at: m.created_at,
        sender: m.profiles as unknown as ChatParticipant | null,
        event: m.event_id ? eventsMap[m.event_id] : null,
      }));
    },
    enabled: !!chatId,
  });
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      chatId,
      content,
      messageType = "text",
      eventId,
    }: {
      chatId: string;
      content: string;
      messageType?: string;
      eventId?: string;
    }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user?.id,
          content,
          message_type: messageType,
          event_id: eventId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ["user-chats"] });
    },
  });
};

// Create or get existing private chat
export const useCreatePrivateChat = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("get_or_create_private_chat", {
        _user_id: user.id,
        _other_user_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-chats"] });
    },
  });
};

// Fetch mutual followers for starting new chats
export const useMutualFollowers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mutual-followers", user?.id],
    queryFn: async (): Promise<MutualFollower[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc("get_mutual_followers", {
        _user_id: user.id,
      });

      if (error) throw error;
      return (data || []) as MutualFollower[];
    },
    enabled: !!user?.id,
  });
};
