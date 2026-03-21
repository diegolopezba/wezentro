import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import {
  useIsOnGuestlist,
  useJoinGuestlist,
  useJoinGuestlistWithPayment,
  useLeaveGuestlist,
  usePendingGuestlistRequests,
  usePendingPayments,
} from "@/hooks/useGuestlist";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent, useSaveCount } from "@/hooks/useSavedEvents";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent, useEventLikes } from "@/hooks/useEventLikes";
import { useHasReposted, useToggleRepost, useRepostCount } from "@/hooks/useReposts";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { format } from "date-fns";

/**
 * Shared hook that centralises all state and logic for event detail views.
 * Used by both EventDetail (full page) and EventDetailOverlay (sheet).
 */
export const useEventDetailState = (
  eventId: string | undefined,
  /** Called to "close" the view — navigate(-1) for the full page, closeEvent() for the overlay */
  onClose: () => void
) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const isGuest = !user;

  // UI state
  const [showManagement, setShowManagement] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestlistInviteModal, setShowGuestlistInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteFriendsSheet, setShowInviteFriendsSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showReservationSheet, setShowReservationSheet] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Data queries
  const { data: event, isLoading, error } = useEvent(eventId);
  const { data: guestlistStatus } = useIsOnGuestlist(eventId);
  const { data: pendingRequests = [] } = usePendingGuestlistRequests(event ? eventId : undefined);
  const { data: pendingPayments = [] } = usePendingPayments(event ? eventId : undefined);
  const { data: guestlist = [] } = useEventGuestlist(eventId);
  const { data: isSaved } = useIsEventSaved(eventId);
  const { data: isLiked } = useIsEventLiked(eventId!);
  const { data: likeCount = 0 } = useEventLikes(event ? eventId! : undefined);
  const { data: hasReposted } = useHasReposted(event ? eventId : undefined);
  const { data: repostCount = 0 } = useRepostCount(event ? eventId : undefined);
  const { data: saveCount = 0 } = useSaveCount(event ? eventId : undefined);

  // Mutations
  const joinGuestlist = useJoinGuestlist();
  const joinGuestlistWithPayment = useJoinGuestlistWithPayment();
  const leaveGuestlist = useLeaveGuestlist();
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();
  const toggleRepost = useToggleRepost();

  // Derived state
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = !!(user && user.id === event?.creator_id);
  const canInviteToGuestlist = isOwner || isApproved;
  const pendingCount = pendingRequests.length + pendingPayments.length;
  const hasPaymentQr = !!(event?.payment_qr_url && (event?.price || 0) > 0);
  const isInviteOnlyGuestlist = !!(event?.price && event.price > 0 && event?.has_guestlist);
  const formattedDate = event?.start_datetime
    ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")
    : null;
  const formattedPrice = event?.price ? `$${event.price}` : "Gratis";

  // Media handlers
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAspectRatio(img.naturalWidth / img.naturalHeight);
    setMediaLoaded(true);
  };
  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      setAspectRatio(videoWidth / videoHeight);
      setMediaLoaded(true);
    }
  };
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  // Action handlers
  const handleSaveToggle = async () => {
    if (isGuest) { promptAuth({ action: "guardar este evento" }); return; }
    try {
      if (isSaved) {
        await unsaveEvent.mutateAsync(eventId!);
        toast.success("Evento eliminado de guardados");
      } else {
        await saveEvent.mutateAsync(eventId!);
        toast.success("¡Evento guardado!");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar evento");
    }
  };

  const handleLikeToggle = async () => {
    if (isGuest) { promptAuth({ action: "dar like a este evento" }); return; }
    try {
      if (isLiked) await unlikeEvent.mutateAsync(eventId!);
      else await likeEvent.mutateAsync(eventId!);
    } catch (error: any) {
      toast.error(error.message || "Error al dar like");
    }
  };

  const handleRepostToggle = async () => {
    if (isGuest) { promptAuth({ action: "repostear este evento" }); return; }
    try {
      await toggleRepost.mutateAsync({ eventId: eventId!, isReposted: !!hasReposted });
    } catch {
      // Error handled in hook
    }
  };

  const handleJoinGuestlist = async () => {
    if (isGuest) { promptAuth({ action: "unirte a esta lista" }); return; }
    if (hasPaymentQr) { setShowPaymentModal(true); return; }
    try {
      await joinGuestlist.mutateAsync(eventId!);
      toast.success("¡Solicitud enviada!");
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al unirse a la lista");
    }
  };

  const handlePaymentSubmitted = async () => {
    try {
      await joinGuestlistWithPayment.mutateAsync(eventId!);
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar pago");
      throw error;
    }
  };

  const handleLeaveGuestlist = async () => {
    try {
      await leaveGuestlist.mutateAsync(eventId!);
      toast.success("Has salido de la lista");
    } catch (error: any) {
      toast.error(error.message || "Error al salir de la lista");
    }
  };

  const handleSendToggle = () => {
    if (isGuest) { promptAuth({ action: "enviar este evento" }); return; }
    setShowShareModal(true);
  };

  return {
    // Data
    event, isLoading, error,
    guestlist, guestlistStatus,
    pendingCount,
    isSaved, isLiked, likeCount,
    hasReposted, repostCount, saveCount,
    // Derived
    isOnGuestlist, isPending, isApproved,
    isOwner, canInviteToGuestlist,
    hasPaymentQr, isInviteOnlyGuestlist,
    isGuest, isAuthenticated: !isGuest,
    formattedDate, formattedPrice,
    // Media
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    // Mutation loading states
    joinGuestlistPending: joinGuestlist.isPending || joinGuestlistWithPayment.isPending,
    leaveGuestlistPending: leaveGuestlist.isPending,
    saveEventPending: saveEvent.isPending || unsaveEvent.isPending,
    likeEventPending: likeEvent.isPending || unlikeEvent.isPending,
    repostPending: toggleRepost.isPending,
    // UI modal state
    showManagement, setShowManagement,
    showShareModal, setShowShareModal,
    showGuestlistInviteModal, setShowGuestlistInviteModal,
    showEditSheet, setShowEditSheet,
    showDeleteDialog, setShowDeleteDialog,
    showPremiumGate, setShowPremiumGate,
    showPaymentModal, setShowPaymentModal,
    showInviteFriendsSheet, setShowInviteFriendsSheet,
    showMenuSheet, setShowMenuSheet,
    showReservationSheet, setShowReservationSheet,
    // Action handlers
    handleSaveToggle,
    handleLikeToggle,
    handleRepostToggle,
    handleJoinGuestlist,
    handlePaymentSubmitted,
    handleLeaveGuestlist,
  };
};
