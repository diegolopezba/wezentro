import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { X, Check, UserX, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  usePendingGuestlistRequests,
  useApproveGuestlistEntry,
  useRejectGuestlistEntry,
} from "@/hooks/useGuestlist";
import { toast } from "sonner";

interface GuestlistManagementSheetProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestlistManagementSheet = ({
  eventId,
  open,
  onOpenChange,
}: GuestlistManagementSheetProps) => {
  const navigate = useNavigate();
  const { data: pendingRequests = [], isLoading } = usePendingGuestlistRequests(eventId);
  const approveEntry = useApproveGuestlistEntry();
  const rejectEntry = useRejectGuestlistEntry();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleApprove = async (entryId: string, userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));
    try {
      await approveEntry.mutateAsync({ entryId, eventId, userId });
      toast.success("Request approved");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleReject = async (entryId: string, userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));
    try {
      await rejectEntry.mutateAsync({ entryId, eventId, userId });
      toast.success("Request declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-brand text-lg">
            Pending Requests ({pendingRequests.length})
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="font-medium text-foreground mb-1">No pending requests</h2>
              <p className="text-sm text-muted-foreground">
                New requests will appear here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingRequests.map((request: any, index: number) => {
                  const isProcessing = processingIds.has(request.id);
                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50"
                    >
                      <img
                        src={request.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.id}`}
                        alt={request.user?.username || "User"}
                        className="w-12 h-12 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/user/${request.user_id}`);
                        }}
                      />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/user/${request.user_id}`);
                        }}
                      >
                        <p className="font-medium text-foreground text-sm truncate">
                          @{request.user?.username || "user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.joined_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive"
                          onClick={() => handleReject(request.id, request.user_id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
                          onClick={() => handleApprove(request.id, request.user_id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
