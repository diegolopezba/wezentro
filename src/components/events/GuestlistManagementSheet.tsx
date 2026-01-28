import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { X, Check, Loader2, Users, DollarSign, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  usePendingGuestlistRequests,
  usePendingPayments,
  useApproveGuestlistEntry,
  useRejectGuestlistEntry,
  useConfirmPayment,
  useRejectPayment,
} from "@/hooks/useGuestlist";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface GuestlistManagementSheetProps {
  eventId: string;
  eventHasPaymentQr?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestlistManagementSheet = ({
  eventId,
  eventHasPaymentQr = false,
  open,
  onOpenChange,
}: GuestlistManagementSheetProps) => {
  const navigate = useNavigate();
  const { data: pendingRequests = [], isLoading: loadingRequests } = usePendingGuestlistRequests(eventId);
  const { data: pendingPayments = [], isLoading: loadingPayments } = usePendingPayments(eventId);
  const approveEntry = useApproveGuestlistEntry();
  const rejectEntry = useRejectGuestlistEntry();
  const confirmPayment = useConfirmPayment();
  const rejectPayment = useRejectPayment();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filter pending requests that don't have pending payments (for non-payment events)
  const nonPaymentPendingRequests = pendingRequests.filter(
    (r: any) => r.payment_status !== "pending"
  );

  const handleApprove = async (entryId: string, userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));
    try {
      await approveEntry.mutateAsync({ entryId, eventId, userId });
      toast.success("Solicitud aprobada");
    } catch (error: any) {
      toast.error(error.message || "Error al aprobar");
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
      toast.success("Solicitud rechazada");
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleConfirmPayment = async (entryId: string, userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));
    try {
      await confirmPayment.mutateAsync({ entryId, eventId, userId });
      toast.success("Pago confirmado");
    } catch (error: any) {
      toast.error(error.message || "Error al confirmar pago");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleRejectPayment = async (entryId: string, userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));
    try {
      await rejectPayment.mutateAsync({ entryId, eventId, userId });
      toast.success("Pago rechazado");
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar pago");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const renderEmptyState = (icon: React.ReactNode, title: string, subtitle: string) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="font-medium text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </motion.div>
  );

  const renderUserRow = (
    request: any,
    index: number,
    actions: React.ReactNode,
    badgeContent?: React.ReactNode
  ) => {
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
          src={request.user?.avatar_url || DEFAULT_AVATAR}
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
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">
              @{request.user?.username || "user"}
            </p>
            {badgeContent}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(request.joined_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2">
          {actions}
        </div>
      </motion.div>
    );
  };

  // If event has payment QR, show tabs
  if (eventHasPaymentQr) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="font-brand text-lg">Gestionar Lista</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="payments" className="h-[calc(100%-50px)]">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="payments" className="flex-1 gap-2">
                <DollarSign className="w-4 h-4" />
                Pagos ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 gap-2">
                <Users className="w-4 h-4" />
                Solicitudes ({nonPaymentPendingRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
              {loadingPayments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingPayments.length === 0 ? (
                renderEmptyState(
                  <DollarSign className="w-8 h-8 text-muted-foreground" />,
                  "Sin pagos pendientes",
                  "Los pagos registrados aparecerán aquí"
                )
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {pendingPayments.map((request: any, index: number) => {
                      const isProcessing = processingIds.has(request.id);
                      return renderUserRow(
                        request,
                        index,
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive"
                            onClick={() => handleRejectPayment(request.id, request.user_id)}
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
                            onClick={() => handleConfirmPayment(request.id, request.user_id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        </>,
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          Pago
                        </Badge>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
              {loadingRequests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : nonPaymentPendingRequests.length === 0 ? (
                renderEmptyState(
                  <Users className="w-8 h-8 text-muted-foreground" />,
                  "Sin solicitudes pendientes",
                  "Las nuevas solicitudes aparecerán aquí"
                )
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {nonPaymentPendingRequests.map((request: any, index: number) => {
                      const isProcessing = processingIds.has(request.id);
                      return renderUserRow(
                        request,
                        index,
                        <>
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
                        </>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Original view for events without payment QR
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-brand text-lg">
            Solicitudes pendientes ({pendingRequests.length})
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
          {loadingRequests ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            renderEmptyState(
              <Users className="w-8 h-8 text-muted-foreground" />,
              "Sin solicitudes pendientes",
              "Las nuevas solicitudes aparecerán aquí"
            )
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingRequests.map((request: any, index: number) => {
                  const isProcessing = processingIds.has(request.id);
                  return renderUserRow(
                    request,
                    index,
                    <>
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
                    </>
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
