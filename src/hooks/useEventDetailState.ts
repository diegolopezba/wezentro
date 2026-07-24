import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEvent, useEventGuestlist } from "@/hooks/useEvents";
import {
  useIsOnGuestlist,
  useJoinGuestlistWithPayment,
  useLeaveGuestlist,
  usePendingGuestlistRequests,
  usePendingPayments,
} from "@/hooks/useGuestlist";
import { useIsEventSaved, useSaveEvent, useUnsaveEvent, useSaveCount } from "@/hooks/useSavedEvents";
import { useIsEventLiked, useLikeEvent, useUnlikeEvent, useEventLikes } from "@/hooks/useEventLikes";
import { useHasReposted, useToggleRepost, useRepostCount } from "@/hooks/useReposts";
import { useFollowingGoing } from "@/hooks/useFollowingGoing";
import { useTicketTiers, computeTierAvailability, type TicketTier } from "@/hooks/useTicketTiers";
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
  
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInviteFriendsSheet, setShowInviteFriendsSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showReservationSheet, setShowReservationSheet] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Data queries
  const { data: event, isLoading, error } = useEvent(eventId);
  const { data: guestlistStatus } = useIsOnGuestlist(eventId);
  const { data: pendingRequests = [] } = usePendingGuestlistRequests(event ? eventId : undefined);
  // Pending payments are only relevant when the event is paid (Qhantuy checkout).
  const _isPaidEvent = (event?.price ?? 0) > 0;
  const { data: pendingPayments = [] } = usePendingPayments(event && _isPaidEvent ? eventId : undefined);
  const { data: guestlist = [] } = useEventGuestlist(eventId);
  const { data: isSaved } = useIsEventSaved(eventId);
  const { data: isLiked } = useIsEventLiked(eventId!);
  const { data: likeCount = 0 } = useEventLikes(event ? eventId! : undefined);
  const { data: hasReposted } = useHasReposted(event ? eventId : undefined);
  const { data: repostCount = 0 } = useRepostCount(event ? eventId : undefined);
  const { data: saveCount = 0 } = useSaveCount(event ? eventId : undefined);
  const { data: attendeesGoing = [] } = useFollowingGoing(eventId);
  const { data: ticketTiers = [] } = useTicketTiers(eventId);

  // Mutations
  const joinGuestlistWithPayment = useJoinGuestlistWithPayment();
  const leaveGuestlist = useLeaveGuestlist();
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const likeEvent = useLikeEvent();
  const unlikeEvent = useUnlikeEvent();
  const toggleRepost = useToggleRepost();

  // Tier-derived state
  const tierAvailability = useMemo(() => computeTierAvailability(ticketTiers), [ticketTiers]);
  const hasTiers = ticketTiers.length > 0;
  // Sequential mode: any tier has a non-null unlock_after_tier_id
  const isSequential = useMemo(
    () => ticketTiers.some((t) => !!t.unlock_after_tier_id),
    [ticketTiers]
  );
  const purchasableTiers = useMemo(
    () => tierAvailability.filter((a) => a.unlocked && !a.soldOut).map((a) => a.tier),
    [tierAvailability]
  );
  const cheapestPurchasableTier: TicketTier | null = useMemo(() => {
    if (purchasableTiers.length === 0) return null;
    return [...purchasableTiers].sort((a, b) => Number(a.price) - Number(b.price))[0];
  }, [purchasableTiers]);
  const allTiersSoldOut = hasTiers && purchasableTiers.length === 0;

  // Derived state
  const isOnGuestlist = !!guestlistStatus;
  const isPending = guestlistStatus?.status === "pending";
  const isApproved = guestlistStatus?.status === "approved";
  const isOwner = !!(user && user.id === event?.creator_id);

  // Secret-location gating: only creator and approved guests can see the address/map.
  const isLocationSecret = !!(event as any)?.is_location_secret;
  const canSeeLocation = !isLocationSecret || isOwner || isApproved;

  const approvedCount = guestlist.length;
  const maxGuestlistCapacity = event?.max_guestlist_capacity ?? null;
  const isGuestlistFull = maxGuestlistCapacity != null && approvedCount >= maxGuestlistCapacity;

  const legacyHasPaid = (event?.price ?? 0) > 0;
  const hasPaidTickets = hasTiers
    ? ticketTiers.some((t) => Number(t.price) > 0)
    : legacyHasPaid;
  // Any priced event (legacy single price or priced tiers) goes through the Qhantuy checkout modal.
  const usesPaidCheckout = hasPaidTickets;
  // Badge should only sum payments when the event actually uses the payment flow.
  const pendingCount = pendingRequests.length + (usesPaidCheckout ? pendingPayments.length : 0);
  const isInviteOnlyGuestlist = !!(hasPaidTickets && event?.has_guestlist);
  const formattedDate = event?.start_datetime
    ? format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")
    : null;

  const formattedPrice = (() => {
    if (hasTiers) {
      if (allTiersSoldOut) return "Agotado";
      const prices = purchasableTiers.map((t) => Number(t.price));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (purchasableTiers.length === 1 || min === max) {
        return min > 0 ? `Bs. ${min}` : "Gratis";
      }
      return `Desde Bs. ${min}`;
    }
    return event?.price ? `Bs. ${event.price}` : "Gratis";
  })();

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

  useEffect(() => {
    setShowManagement(false);
    setShowShareModal(false);
    setShowEditSheet(false);
    setShowDeleteDialog(false);
    setShowPremiumGate(false);
    setShowPaymentModal(false);
    setShowInviteFriendsSheet(false);
    setShowMenuSheet(false);
    setShowReservationSheet(false);
    setShowComments(false);
    setShowTierPicker(false);
    setShowLeaveConfirm(false);
    setSelectedTier(null);
    setMediaLoaded(false);
    // NOTE: deliberately NOT resetting aspectRatio here. Letting the previous
    // value persist until the new media's onLoad fires keeps the hero from
    // collapsing to 16/9 for a frame when navigating between two events of
    // different aspect ratios (Pinterest/Instagram-style smooth swap).
    setIsMuted(true);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
  }, [eventId]);

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

  const openPaymentForTier = (tier: TicketTier) => {
    setSelectedTier(tier);
    setShowTierPicker(false);
    setShowPaymentModal(true);
  };

  const handleBuyTicket = async () => {
    if (isGuest) { promptAuth({ action: "comprar entrada" }); return; }
    // Multi-tier path
    if (hasTiers) {
      if (allTiersSoldOut) { toast.error("Todas las entradas están agotadas"); return; }
      // Sequential mode → only one tier visible at a time, skip picker
      if (isSequential || purchasableTiers.length === 1) {
        if (cheapestPurchasableTier) openPaymentForTier(cheapestPurchasableTier);
        return;
      }
      setShowTierPicker(true);
      return;
    }
    // Legacy single-price path
    if (hasPaymentQr) { setSelectedTier(null); setShowPaymentModal(true); return; }
    try {
      await joinGuestlistWithPayment.mutateAsync(eventId!);
      toast.success(hasPaidTickets ? "¡Compra registrada! El organizador confirmará tu pago." : "¡Registro confirmado!");
      setShowInviteFriendsSheet(true);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar");
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
    attendeesGoing,
    // Derived
    isOnGuestlist, isPending, isApproved,
    isOwner,
    approvedCount, maxGuestlistCapacity, isGuestlistFull,
    hasPaidTickets, hasPaymentQr, isInviteOnlyGuestlist,
    isLocationSecret, canSeeLocation,
    isGuest, isAuthenticated: !isGuest,
    formattedDate, formattedPrice,
    // Media
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    // Mutation loading states
    buyTicketPending: joinGuestlistWithPayment.isPending,
    leaveGuestlistPending: leaveGuestlist.isPending,
    saveEventPending: saveEvent.isPending || unsaveEvent.isPending,
    likeEventPending: likeEvent.isPending || unlikeEvent.isPending,
    repostPending: toggleRepost.isPending,
    // UI modal state
    showManagement, setShowManagement,
    showShareModal, setShowShareModal,
    
    showEditSheet, setShowEditSheet,
    showDeleteDialog, setShowDeleteDialog,
    showPremiumGate, setShowPremiumGate,
    showPaymentModal, setShowPaymentModal,
    showInviteFriendsSheet, setShowInviteFriendsSheet,
    showMenuSheet, setShowMenuSheet,
    showReservationSheet, setShowReservationSheet,
    showComments, setShowComments,
    showTierPicker, setShowTierPicker,
    showLeaveConfirm, setShowLeaveConfirm,
    // Tiers
    ticketTiers, hasTiers, isSequential, allTiersSoldOut,
    purchasableTiers, cheapestPurchasableTier,
    selectedTier, setSelectedTier,
    openPaymentForTier,
    // Action handlers
    handleSaveToggle,
    handleLikeToggle,
    handleRepostToggle,
    handleSendToggle,
    handleBuyTicket,
    handlePaymentSubmitted,
    handleLeaveGuestlist,
  };
};
