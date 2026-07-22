import { useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { X, Check, Loader2, Users, DollarSign, Clock, QrCode, Copy, RotateCcw, Share2, UserCheck, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useEventGuestlist } from "@/hooks/useEvents";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface GuestlistManagementSheetProps {
  eventId: string;
  eventHasPaymentQr?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Scanner panel ────────────────────────────────────────────────────────────
function ScannerPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: scannerToken, isLoading } = useQuery({
    queryKey: ["scanner-token", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("scanner_access_token")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return (data as any).scanner_access_token as string;
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("events")
        .update({ scanner_access_token: newToken } as any)
        .eq("id", eventId);
      if (error) throw error;
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanner-token", eventId] });
      toast.success("Enlace regenerado — el anterior ya no funciona");
    },
    onError: () => toast.error("Error al regenerar el enlace"),
  });

  const baseUrl = window.location.origin;
  const scannerUrl = scannerToken ? `${baseUrl}/scan/${eventId}?key=${scannerToken}` : "";

  const handleCopy = async () => {
    if (!scannerUrl) return;
    await navigator.clipboard.writeText(scannerUrl);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!scannerUrl) return;
    if (navigator.share) {
      await navigator.share({ title: "Escáner de entradas", url: scannerUrl });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Explainer card */}
      <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <p className="font-medium text-foreground text-sm">Escáner para personal</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Comparte este enlace con tus porteros o personal de entrada. Solo verán la cámara para escanear entradas — sin acceso a tu cuenta ni datos confidenciales.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* URL preview */}
          <div className="rounded-xl bg-secondary/30 border border-border p-3">
            <p className="text-xs font-mono text-muted-foreground break-all leading-relaxed">
              {scannerUrl || "Generando enlace…"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="hero" className="gap-2" onClick={handleShare}
              disabled={!scannerUrl}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copiado" : "Compartir"}
            </Button>
            <Button
              variant="outline" className="gap-2" onClick={handleCopy}
              disabled={!scannerUrl}
            >
              <Copy className="w-4 h-4" />
              Copiar
            </Button>
          </div>

          {/* Regenerate */}
          <div className="rounded-2xl bg-destructive/5 border border-destructive/10 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Revocar acceso</p>
              <p className="text-xs text-muted-foreground mt-1">
                Regenera el enlace para invalidar cualquier enlace compartido anteriormente.
              </p>
            </div>
            <Button
              variant="outline" size="sm" className="gap-2 border-destructive/20 text-destructive " onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Regenerar enlace
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
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
  const { data: approvedGuests = [], isLoading: loadingApproved } = useEventGuestlist(open ? eventId : undefined);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Filter pending requests that don't have pending payments (for non-payment events)
  const nonPaymentPendingRequests = pendingRequests.filter(
    (r: any) => r.payment_status !== "pending" );

  const matchesSearch = (entry: any, q: string) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const u = entry.user;
    return (
      (u?.username || "").toLowerCase().includes(needle) ||
      (u?.full_name || "").toLowerCase().includes(needle)
    );
  };

  const filteredPendingRequests = useMemo(
    () => pendingRequests.filter((r: any) => matchesSearch(r, search)),
    [pendingRequests, search]
  );
  const filteredNonPaymentPending = useMemo(
    () => nonPaymentPendingRequests.filter((r: any) => matchesSearch(r, search)),
    [nonPaymentPendingRequests, search]
  );
  const filteredPendingPayments = useMemo(
    () => pendingPayments.filter((r: any) => matchesSearch(r, search)),
    [pendingPayments, search]
  );
  const filteredApproved = useMemo(
    () => approvedGuests.filter((r: any) => matchesSearch(r, search)),
    [approvedGuests, search]
  );

  const SearchBar = (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o usuario"
        className="pl-9 rounded-full bg-secondary/50 border-border"
      />
    </div>
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center" >
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="font-medium text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </m.div>
  );

  const renderUserRow = (
    request: any,
    index: number,
    actions: React.ReactNode,
    badgeContent?: React.ReactNode
  ) => {
    const isProcessing = processingIds.has(request.id);
    return (
      <m.div
        key={request.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20, height: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50" >
        <img
          src={request.user?.avatar_url || DEFAULT_AVATAR}
          alt={request.user?.username || "User"}
          className="w-12 h-12 rounded-full object-cover cursor-pointer transition-transform" onClick={() => {
            onOpenChange(false);
            navigate(`/user/${request.user_id}`);
          }}
        />
        <div
          className="flex-1 min-w-0 cursor-pointer" onClick={() => {
            onOpenChange(false);
            navigate(`/user/${request.user_id}`);
          }}
        >
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">
              {request.user?.username || "user"}
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
      </m.div>
    );
  };

  const renderApprovedTabContent = () => (
    <TabsContent value="approved" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
      {loadingApproved ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : approvedGuests.length === 0 ? (
        renderEmptyState(
          <UserCheck className="w-8 h-8 text-muted-foreground" />,
          "Aún sin aceptados",
          "Las personas que aceptes aparecerán aquí"
        )
      ) : filteredApproved.length === 0 ? (
        renderEmptyState(
          <Search className="w-8 h-8 text-muted-foreground" />,
          "Sin resultados",
          "Prueba con otro nombre o usuario"
        )
      ) : (
        <div className="space-y-3">
          {filteredApproved.map((entry: any, index: number) =>
            renderUserRow(
              entry,
              index,
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                <Check className="w-3 h-3 mr-1" />
                Aceptado
              </Badge>
            )
          )}
        </div>
      )}
    </TabsContent>
  );

  // ── Event has payment QR → show 4 tabs ────────────────────────────────────
  if (eventHasPaymentQr) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="font-brand text-lg">Gestionar Lista</SheetTitle>
          </SheetHeader>

          {SearchBar}

          <Tabs defaultValue="payments" className="h-[calc(100%-110px)]">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="payments" className="flex-1 gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" />
                Pagos ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                Solicitudes ({nonPaymentPendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex-1 gap-1.5 text-xs">
                <UserCheck className="w-3.5 h-3.5" />
                Aceptados ({approvedGuests.length})
              </TabsTrigger>
              <TabsTrigger value="scanner" className="flex-1 gap-1.5 text-xs">
                <QrCode className="w-3.5 h-3.5" />
                Escáner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
              {loadingPayments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingPayments.length === 0 ? (
                renderEmptyState(
                  <DollarSign className="w-8 h-8 text-muted-foreground" />, "Sin pagos pendientes", "Los pagos registrados aparecerán aquí" )
              ) : filteredPendingPayments.length === 0 ? (
                renderEmptyState(
                  <Search className="w-8 h-8 text-muted-foreground" />, "Sin resultados", "Prueba con otro nombre o usuario" )
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredPendingPayments.map((request: any, index: number) => {
                      const isProcessing = processingIds.has(request.id);
                      return renderUserRow(
                        request,
                        index,
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive" onClick={() => handleRejectPayment(request.id, request.user_id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary" onClick={() => handleConfirmPayment(request.id, request.user_id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        </>,
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
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
                  <Users className="w-8 h-8 text-muted-foreground" />, "Sin solicitudes pendientes", "Las nuevas solicitudes aparecerán aquí" )
              ) : filteredNonPaymentPending.length === 0 ? (
                renderEmptyState(
                  <Search className="w-8 h-8 text-muted-foreground" />, "Sin resultados", "Prueba con otro nombre o usuario" )
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredNonPaymentPending.map((request: any, index: number) => {
                      const isProcessing = processingIds.has(request.id);
                      return renderUserRow(
                        request,
                        index,
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive" onClick={() => handleReject(request.id, request.user_id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary" onClick={() => handleApprove(request.id, request.user_id)}
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

            {renderApprovedTabContent()}

            <TabsContent value="scanner" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
              <ScannerPanel eventId={eventId} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // ── Original view for events without payment QR → 3 tabs ─────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="font-brand text-lg">Gestionar Lista</SheetTitle>
        </SheetHeader>

        {SearchBar}

        <Tabs defaultValue="requests" className="h-[calc(100%-110px)]">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="requests" className="flex-1 gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              Solicitudes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 gap-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5" />
              Aceptados ({approvedGuests.length})
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex-1 gap-1.5 text-xs">
              <QrCode className="w-3.5 h-3.5" />
              Escáner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              renderEmptyState(
                <Users className="w-8 h-8 text-muted-foreground" />, "Sin solicitudes pendientes", "Las nuevas solicitudes aparecerán aquí" )
            ) : filteredPendingRequests.length === 0 ? (
              renderEmptyState(
                <Search className="w-8 h-8 text-muted-foreground" />, "Sin resultados", "Prueba con otro nombre o usuario" )
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredPendingRequests.map((request: any, index: number) => {
                    const isProcessing = processingIds.has(request.id);
                    return renderUserRow(
                      request,
                      index,
                      <>
                        <Button
                          variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive" onClick={() => handleReject(request.id, request.user_id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary" onClick={() => handleApprove(request.id, request.user_id)}
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

          {renderApprovedTabContent()}

          <TabsContent value="scanner" className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
            <ScannerPanel eventId={eventId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
