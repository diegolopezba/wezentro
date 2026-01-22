import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutualFollowers, MutualFollower } from "@/hooks/useChats";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface CollaboratorPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: MutualFollower) => void;
  excludeUserIds?: string[];
}

export const CollaboratorPickerModal = ({
  open,
  onOpenChange,
  onSelect,
  excludeUserIds = [],
}: CollaboratorPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: mutualFollowers, isLoading } = useMutualFollowers();

  // Filter based on search and exclude already selected
  const filteredFollowers = mutualFollowers?.filter((follower) => {
    if (excludeUserIds.includes(follower.id)) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      follower.username.toLowerCase().includes(query) ||
      (follower.full_name?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleSelect = (follower: MutualFollower) => {
    onSelect(follower);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5 text-primary" />
            Invitar colaborador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar seguidores mutuos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            Solo puedes invitar a seguidores mutuos (personas que te siguen y tú sigues).
          </p>

          {/* Followers list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredFollowers && filteredFollowers.length > 0 ? (
              <AnimatePresence>
                {filteredFollowers.map((follower, index) => (
                  <motion.div
                    key={follower.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(follower)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={follower.avatar_url || DEFAULT_AVATAR} />
                      <AvatarFallback>{follower.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        @{follower.username}
                      </p>
                      {follower.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {follower.full_name}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserPlus className="w-10 h-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No se encontraron seguidores mutuos"
                    : "No tienes seguidores mutuos aún"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {!searchQuery && "Sigue a más personas que te siguen para colaborar"}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
