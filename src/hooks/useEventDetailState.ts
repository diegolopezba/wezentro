import { useState, useRef, useEffect, useMemo } from "react";
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
import { useFollowingGoing } from "@/hooks/useFollowingGoing";
import { useTicketTiers, computeTierAvailability, type TicketTier } from "@/hooks/useTicketTiers";
import { useEventAreas, confirmFreeAreaBooking, type EventArea } from "@/hooks/useVenueLayouts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { trackCheckoutTap } from "@/lib/analyticsTracking";
import { format } from "date-fns";
import { getSalePhase, earlyAccessEndsAt, publicSaleStartsAt } from "@/lib/salePhase";
import {
  useEventWaitlist,
  useJoinWaitlist,
  useLeaveWaitlist,
  useReleaseWaitlist,
} from "@/hooks/useEventWaitlist";

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
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [selectedArea, setSelectedArea] = useState<EventArea | null>(null);
  const [areaBooking, setAreaBooking] = useState<{ bookingId: string; partySize: number } | null>(null);
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
  const { data: eventAreas = [] } = useEventAreas(eventId);

  // Mutations
  const joinGuestlist = useJoinGuestlist();
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
  const openTiers = useMemo(
    () => tierAvailability.filter((a) => a.unlocked && !a.soldOut).map((a) => a.tier),
    [tierAvailability]
  );
  const allTiersSoldOut = hasTiers && openTiers.length === 0;


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
  // Visual venue layout mode (opt-in per event) takes over the checkout when present.
  const hasAreas = eventAreas.some((a) => !a.is_decor);
  const hasPaidTickets = hasAreas
    ? eventAreas.some((a) => Number(a.price) > 0)
    : hasTiers
    ? ticketTiers.some((t) => Number(t.price) > 0)
    : legacyHasPaid;
  // Any priced event (legacy single price or priced tiers) goes through the Qhantuy checkout modal.
  const usesPaidCheckout = hasPaidTickets;
  // Badge should only sum payments when the event actually uses the payment flow.
  const pendingCount = pendingRequests.length + (usesPaidCheckout ? pendingPayments.length : 0);
  const isInviteOnlyGuestlist = !!(hasPaidTickets && event?.has_guestlist);
  // Event has ended once its calendar day is in the past (time of day ignored).
  const hasEnded = (() => {
    const raw = event?.end_datetime || event?.start_datetime;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return eventDay < today;
  })();

  const formattedDate = event?.start_datetime
    ? `${format(new Date(event.start_datetime), "EEE, MMM d • h:mm a")}${
        event?.end_datetime && !isNaN(new Date(event.end_datetime).getTime())
          ? ` - ${format(new Date(event.end_datetime), "h:mm a")}`
          : ""
      }`
    : null;

  // ── Waiting list (pre-sale) ──────────────────────────────────────────
  const waitlistEnabled = !!(event as any)?.waitlist_enabled;
  const salePhase = getSalePhase(event as any);
  const isWaitlistPhase = salePhase === "waitlist";
  const isEarlyAccessPhase = salePhase === "early_access";
  const { data: waitlistState } = useEventWaitlist(eventId, waitlistEnabled);
  const isOnWaitlist = !!waitlistState?.isOnWaitlist;
  const waitlistPosition = waitlistState?.position ?? null;
  const waitlistTotal = waitlistState?.total ?? 0;
  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();
  const releaseWaitlist = useReleaseWaitlist();
  const earlyAccessEnds = earlyAccessEndsAt(event as any);
  const publicSaleStarts = publicSaleStartsAt(event as any);
  // Only waitlist members can buy during the exclusive window.
  const canPurchaseNow = !waitlistEnabled || salePhase === "public" || (isEarlyAccessPhase && isOnWaitlist);
  /** Tier the waiting list is attached to (Dice-style pre-sale on one ticket type). */
  const waitlistTierId: string | null = (event as any)?.waitlist_tier_id ?? null;
  const waitlistTier = useMemo(
    () => (waitlistTierId ? ticketTiers.find((t) => t.id === waitlistTierId) ?? null : null),
    [waitlistTierId, ticketTiers]
  );

  /** Buyable right now: during early access only the waitlist tier is on sale. */
  const purchasableTiers = useMemo(() => {
    if (isEarlyAccessPhase && waitlistTierId) {
      const only = openTiers.filter((t) => t.id === waitlistTierId);
      if (only.length > 0) return only;
    }
    return openTiers;
  }, [openTiers, isEarlyAccessPhase, waitlistTierId]);
  const cheapestPurchasableTier: TicketTier | null = useMemo(() => {
    if (purchasableTiers.length === 0) return null;
    return [...purchasableTiers].sort((a, b) => Number(a.price) - Number(b.price))[0];
  }, [purchasableTiers]);

  const formattedPrice = (() => {
    if (hasTiers) {
      // During the pre-sale, prices are visible (Dice-style) but nothing is buyable yet.
      const source = isWaitlistPhase ? ticketTiers : purchasableTiers;
      if (!isWaitlistPhase && allTiersSoldOut) return "Agotado";
      if (source.length === 0) return "Agotado";
      const prices = source.map((t) => Number(t.price));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (source.length === 1 || min === max) {
        return min > 0 ? `Bs. ${min}` : "Gratis";
      }
      return `Desde Bs. ${min}`;
    }
    if (isWaitlistPhase) return "Entradas próximamente";
    return event?.price ? `Bs. ${event.price}` : "Gratis";
  })();


  const handleToggleWaitlist = async () => {
    if (isGuest) { promptAuth({ action: "unirte a la lista de espera" }); return; }
    if (!eventId) return;
    if (isOnWaitlist) await leaveWaitlist.mutateAsync(eventId);
    else await joinWaitlist.mutateAsync(eventId);
  };

  const handleReleaseTickets = async () => {
    if (!eventId) return;
    await releaseWaitlist.mutateAsync(eventId);
  };

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

  /** Called by the visual layout picker once the area is atomically held. */
  const openPaymentForArea = ({
    area,
    partySize,
    bookingId,
  }: { area: EventArea; partySize: number; bookingId: string }) => {
    setSelectedTier(null);
    setSelectedArea(area);
    setAreaBooking({ bookingId, partySize });
    setShowAreaPicker(false);
    setShowPaymentModal(true);
  };

  const handleBuyTicket = async () => {
    if (isGuest) { promptAuth({ action: "unirte a este evento" }); return; }
    if (!canPurchaseNow) {
      toast.error(
        isWaitlistPhase
          ? "Las entradas todavía no están a la venta"
          : "Acceso anticipado solo para la lista de espera"
      );
      return;
    }
    // Funnel: intent tap (fire-and-forget, never blocks the checkout)
    if (eventId) void trackCheckoutTap(eventId, user?.id ?? null);
    // Visual venue layout path → pick an area first
    if (hasAreas) {
      setSelectedArea(null);
      setAreaBooking(null);
      setShowAreaPicker(true);
      return;
    }
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
    // Legacy single-price path (paid) → QR checkout
    if (usesPaidCheckout) { setSelectedTier(null); setShowPaymentModal(true); return; }
    // Free event → open the same checkout sheet, "Sí, quiero unirme" confirms
    setSelectedTier(null);
    setShowPaymentModal(true);
  };

  /**
   * Free tickets never hit the payment callback, so dispatch their confirmation here.
   * Email problems must never block the ticket: the entry already exists.
   */
  const sendFreeTicketEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-purchase-tickets", {
        body: { eventId },
      });
      if (error || !data || data.queued < 1) {
        console.error("Free ticket confirmation email failed", { error, data });
        toast.message("Tu entrada está confirmada. El correo puede demorar en llegar.");
      }
    } catch (e) {
      console.error("Free ticket confirmation email failed", e);
      toast.message("Tu entrada está confirmada. El correo puede demorar en llegar.");
    }
  };

  const handleConfirmFreeJoin = async () => {
    try {
      // Free area booking → confirm the existing hold instead of a plain guestlist join
      if (areaBooking) {
        await confirmFreeAreaBooking(areaBooking.bookingId);
        await sendFreeTicketEmail();
        return;
      }
      await joinGuestlist.mutateAsync({
        eventId: eventId!,
        ticketTierId: selectedTier?.id ?? null,
      });
      await sendFreeTicketEmail();
    } catch (error: any) {
      toast.error(error.message || "Error al unirte");
      throw error;
    }
  };



  const handlePaymentSubmitted = async () => {
    // Qhantuy callback already upserts the guestlist entry and inserts the notification.
    // Here we just refresh any local views that depend on it.
    // The success screen inside PaymentQRModal owns the "congrats" UI.
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
    hasPaidTickets, usesPaidCheckout, isInviteOnlyGuestlist,
    isLocationSecret, canSeeLocation,
    isGuest, isAuthenticated: !isGuest,
    formattedDate, formattedPrice, hasEnded,
    // Waiting list (pre-sale)
    waitlistEnabled, salePhase, isWaitlistPhase, isEarlyAccessPhase,
    isOnWaitlist, waitlistPosition, waitlistTotal,
    earlyAccessEnds, publicSaleStarts, canPurchaseNow,
    waitlistTierId, waitlistTier,

    handleToggleWaitlist, handleReleaseTickets,
    waitlistPending: joinWaitlist.isPending || leaveWaitlist.isPending,
    releasePending: releaseWaitlist.isPending,
    // Media
    videoRef, mediaLoaded, aspectRatio, isMuted,
    handleImageLoad, handleVideoMetadata, toggleMute, togglePlayPause,
    // Mutation loading states
    buyTicketPending: joinGuestlistWithPayment.isPending || joinGuestlist.isPending,
    joinGuestlistPending: joinGuestlist.isPending,
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
    showAreaPicker, setShowAreaPicker,
    // Visual venue layout
    eventAreas, hasAreas, selectedArea, areaBooking, openPaymentForArea,
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
    handleConfirmFreeJoin,
    handlePaymentSubmitted,
    handleLeaveGuestlist,
  };
};
