import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AtSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchUsers, SearchUser } from "@/hooks/useSearchUsers";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useAuth } from "@/contexts/AuthContext";

interface TagPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: SearchUser) => void;
  excludeUserIds?: string[];
}

export const TagPickerModal = ({
  open,
  onOpenChange,
  onSelect,
  excludeUserIds = [],
}: TagPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { data: searchResults, isLoading } = useSearchUsers(searchQuery);

  const filteredResults = searchResults?.filter(
    (u) => !excludeUserIds.includes(u.id) && u.id !== user?.id
  );

  const handleSelect = (selectedUser: SearchUser) => {
    onSelect(selectedUser);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AtSign className="w-5 h-5 text-primary" />
            Etiquetar cuenta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Etiqueta a cualquier usuario. Recibirán una notificación y podrán aceptar mostrar la publicación en su perfil.
          </p>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AtSign className="w-10 h-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredResults && filteredResults.length > 0 ? (
              <AnimatePresence>
                {filteredResults.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(result)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={result.avatar_url || DEFAULT_AVATAR} />
                      <AvatarFallback>{result.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        @{result.username}
                      </p>
                      {result.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.full_name}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron usuarios
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
