import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Message } from "@/hooks/useChats";
import { useAuth } from "@/contexts/AuthContext";
import EventInviteCard from "./EventInviteCard";
import GuestlistInviteCard from "./GuestlistInviteCard";

interface MessageBubbleProps {
  message: Message;
  index: number;
}

const MessageBubble = ({ message, index }: MessageBubbleProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isMe = message.sender_id === user?.id;
  const isSystem = message.message_type === "system";
  const isEventInvite = message.message_type === "event_invite";
  const isGuestlistInvite = message.message_type === "guestlist_invite";

  // System messages
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="flex justify-center py-2"
      >
        <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {message.content}
        </p>
      </motion.div>
    );
  }

  // Event invite messages
  if (isEventInvite && message.event) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
      >
        <div className="max-w-[80%]">
          {!isMe && message.sender && (
            <p 
              className="text-xs text-muted-foreground mb-1 ml-1 cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${message.sender_id}`)}
            >
              {message.sender.full_name || message.sender.username}
            </p>
          )}
          <EventInviteCard event={message.event} />
          <p className={`text-xs mt-1 ${isMe ? "text-right mr-1" : "ml-1"} text-muted-foreground`}>
            {formatTime(message.created_at)}
          </p>
        </div>
      </motion.div>
    );
  }

  // Guestlist invite messages
  if (isGuestlistInvite && message.event) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
      >
        <div className="max-w-[80%]">
          {!isMe && message.sender && (
            <p 
              className="text-xs text-muted-foreground mb-1 ml-1 cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${message.sender_id}`)}
            >
              {message.sender.full_name || message.sender.username}
            </p>
          )}
          <GuestlistInviteCard event={message.event} senderId={message.sender_id} />
          <p className={`text-xs mt-1 ${isMe ? "text-right mr-1" : "ml-1"} text-muted-foreground`}>
            {formatTime(message.created_at)}
          </p>
        </div>
      </motion.div>
    );
  }

  // Regular text messages
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className="max-w-[75%]">
        {!isMe && message.sender && (
          <p 
            className="text-xs text-muted-foreground mb-1 ml-3 cursor-pointer hover:underline"
            onClick={() => navigate(`/user/${message.sender_id}`)}
          >
            {message.sender.full_name || message.sender.username}
          </p>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isMe
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-secondary text-foreground rounded-bl-md"
          }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>
        <p
          className={`text-xs mt-1 ${
            isMe ? "text-right mr-1" : "ml-3"
          } text-muted-foreground`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  );
};

const formatTime = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default MessageBubble;
