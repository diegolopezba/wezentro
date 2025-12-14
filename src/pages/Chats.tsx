import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockChats = [
  {
    id: "1",
    name: "Neon Nights VIP",
    type: "event",
    lastMessage: "See you tonight! 🎉",
    time: "2m ago",
    unread: 3,
    avatar: "https://images.unsplash.com/photo-1571266028243-d220c6a73b68?w=100&q=80",
  },
  {
    id: "2",
    name: "Alex Martinez",
    type: "private",
    lastMessage: "Are you going to the festival?",
    time: "15m ago",
    unread: 0,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
  {
    id: "3",
    name: "Electronic Dreams Crew",
    type: "event",
    lastMessage: "The DJ lineup just dropped! 🔥",
    time: "1h ago",
    unread: 12,
    avatar: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=100&q=80",
  },
  {
    id: "4",
    name: "Sarah Chen",
    type: "private",
    lastMessage: "Thanks for the invite!",
    time: "3h ago",
    unread: 0,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    id: "5",
    name: "Rooftop Vibes Gang",
    type: "event",
    lastMessage: "Who's bringing the speakers?",
    time: "5h ago",
    unread: 1,
    avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&q=80",
  },
];

const Chats = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="font-brand text-xl font-bold text-foreground">
            Messages
          </h1>
          <Button variant="ghost" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Chat list */}
      <div className="px-4 py-2">
        {mockChats.map((chat, index) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/chats/${chat.id}`)}
            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/50 cursor-pointer transition-colors"
          >
            <div className="relative">
              <img
                src={chat.avatar}
                alt={chat.name}
                className="w-14 h-14 rounded-2xl object-cover"
              />
              {chat.type === "event" && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-xs">
                  👥
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {chat.name}
                </h3>
                <span className="text-xs text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {chat.lastMessage}
              </p>
            </div>

            {chat.unread > 0 && (
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {chat.unread}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Empty state hint */}
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          💬 Start a conversation or join an event guestlist to chat!
        </p>
      </div>
    </AppLayout>
  );
};

export default Chats;
