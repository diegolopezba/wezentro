import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Phone, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const mockUsers: Record<string, {
  name: string;
  username: string;
  avatar: string;
}> = {
  "user-1": {
    name: "Alex Martinez",
    username: "@partygoer_1",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"
  },
  "user-2": {
    name: "Sarah Chen",
    username: "@partygoer_2",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"
  },
  "user-3": {
    name: "Jordan Lee",
    username: "@partygoer_3",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"
  }
};
const mockMessages = [{
  id: "1",
  text: "Hey! Are you going to the event tonight?",
  sender: "them",
  time: "10:30 AM"
}, {
  id: "2",
  text: "Yes! Can't wait 🎉",
  sender: "me",
  time: "10:32 AM"
}, {
  id: "3",
  text: "Should be amazing, the DJ lineup looks incredible",
  sender: "them",
  time: "10:33 AM"
}, {
  id: "4",
  text: "Right? See you there!",
  sender: "me",
  time: "10:35 AM"
}];
const ChatDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const user = mockUsers[id || "user-1"] || mockUsers["user-1"];
  const handleSend = () => {
    if (message.trim()) {
      // TODO: Implement actual message sending
      setMessage("");
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chats")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => navigate(`/user/${id}`)}
          >
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h1 className="font-semibold text-foreground">{user.name}</h1>
              <p className="text-xs text-muted-foreground">{user.username}</p>
            </div>
          </div>

          <div className="flex gap-2">
            
            
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {mockMessages.map((msg, index) => <motion.div key={msg.id} initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: index * 0.05
      }} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${msg.sender === "me" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </motion.div>)}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 p-4 glass-strong safe-bottom">
        <div className="flex gap-3">
          <Input placeholder="Type a message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} className="flex-1" />
          <Button variant="hero" size="icon" onClick={handleSend}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>;
};
export default ChatDetail;