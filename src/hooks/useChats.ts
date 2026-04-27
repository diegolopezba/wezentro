import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendPushNotification } from "@/lib/pushNotifications";
import { haptic } from "@/lib/haptics";
import { useBlockedIds } from "./useBlockedUsers";

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

// Fetch all chats for current user — uses server-side function for O(1) unread counts
export const useUserChats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-chats", user?.id],
    queryFn: async (): Promise<ChatWithDetails[]> => {
      if (!user?.id) return [];

      // Single efficient query: last message + unread count via DB function
      const { data: chatRows, error: chatErr } = await supabase
        .rpc("get_chat_list_with_unread", { _user_id: user.id });

      if (chatErr) throw chatErr;
      if (!chatRows || chatRows.length === 0) return [];

      const chatIds = chatRows.map((r: any) => r.chat_id as string);

      // Fetch participants for all chats in one query
      const { data: allParticipants, error: partErr } = await supabase
        .from("chat_participants")
        .select(`
          chat_id,
          profiles:user_id (
            id, username, full_name, avatar_url
          )
        `)
        .in("chat_id", chatIds);

      if (partErr) throw partErr;

      // Fetch event details for event chats in one query
      const eventIds = chatRows
        .filter((r: any) => r.event_id)
        .map((r: any) => r.event_id as string);

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

      const chatsWithDetails: ChatWithDetails[] = chatRows.map((row: any) => {
        const chatParticipants = (allParticipants || [])
          .filter((p) => p.chat_id === row.chat_id)
          .map((p) => p.profiles as unknown as ChatParticipant)
          .filter((p): p is ChatParticipant => p !== null);

        const otherParticipants = chatParticipants.filter((p) => p.id !== user.id);

        return {
          id: row.chat_id,
          type: row.chat_type,
          name: row.chat_type === "private" && otherParticipants.length > 0
            ? otherParticipants[0].full_name || otherParticipants[0].username
            : row.chat_name,
          event_id: row.event_id,
          created_at: row.chat_created_at,
          participants: chatParticipants,
          lastMessage: row.last_message_at
            ? {
                content: row.last_message_content,
                created_at: row.last_message_at,
                sender_id: row.last_message_sender_id,
              }
            : null,
          unreadCount: Number(row.unread_count) || 0,
          event: row.event_id ? eventsMap[row.event_id] || null : null,
        };
      });

      // Filter out private chats with no messages
      return chatsWithDetails.filter((chat) => {
        if (chat.type === "event") return true;
        return chat.lastMessage !== null;
      });
    },
    enabled: !!user?.id,
    // Realtime subscription on messages keeps unread counts fresh; cache absorbs focus/remount refetches.
    staleTime: 2 * 60 * 1000,
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
      // Get sender's profile for notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user?.id)
        .single();

      // Get other participants in the chat to notify
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("chat_id", chatId)
        .neq("user_id", user?.id);

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

      // Send push notification to other participants
      if (participants && participants.length > 0) {
        const recipientIds = participants.map((p) => p.user_id);
        const senderName = senderProfile?.full_name || senderProfile?.username || "Someone";
        
        sendPushNotification({
          userIds: recipientIds,
          title: `Message from ${senderName}`,
          body: content.length > 100 ? content.substring(0, 97) + "..." : content,
          data: { type: "message", chatId },
          url: `/chats/${chatId}`,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      haptic("light");
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
