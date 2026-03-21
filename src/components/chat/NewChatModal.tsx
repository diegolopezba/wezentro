import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutualFollowers, useCreatePrivateChat } from "@/hooks/useChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewChatModal = ({ open, onOpenChange }: NewChatModalProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: mutualFollowers, isLoading } = useMutualFollowers();
  const createChat = useCreatePrivateChat();

  const filteredFollowers = (mutualFollowers || []).filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleSelectUser = async (userId: string) => {
    try {
      const chatId = await createChat.mutateAsync(userId);
      onOpenChange(false);
      navigate(`/chats/${chatId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuevo mensaje</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar seguidores mutuos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        <div className="mt-2 max-h-[300px] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : filteredFollowers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {searchQuery
                ? "No se encontraron usuarios"
                : "Solo puedes enviar mensajes a seguidores mutuos"}
            </div>
          ) : (
            filteredFollowers.map((user, index) => (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelectUser(user.id)}
                disabled={createChat.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left disabled:opacity-50"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar_url || DEFAULT_AVATAR} />
                  <AvatarFallback />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
