import { Suspense, lazy, useEffect } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";

// Wrapper for lazy imports that recovers from chunk-load failures
const lazyWithRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn()
      .then((mod) => {
        sessionStorage.removeItem("chunk_reload");
        return mod;
      })
      .catch((err) => {
        // A stale cached index.html can point at chunks that no longer exist.
        // Reload once to pick up the fresh build instead of crashing the app.
        const hasReloaded = sessionStorage.getItem("chunk_reload");
        if (!hasReloaded) {
          sessionStorage.setItem("chunk_reload", "1");
          window.location.reload();
          // Keep Suspense pending while the page reloads.
          return new Promise(() => {}) as Promise<any>;
        }
        throw err;
      })
  );


import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OneSignalProvider } from "@/contexts/OneSignalContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestAllowedRoute } from "@/components/auth/GuestAllowedRoute";
import { NotificationFeedbackProvider } from "@/components/NotificationFeedbackProvider";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { PageLoader } from "@/components/PageLoader";
import { LazyRoute } from "@/components/layout/LazyRoute";
import { AuthPromptProvider } from "@/hooks/useAuthPrompt";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { KeepAliveLayout } from "@/components/layout/KeepAliveLayout";
import { EulaGate } from "@/components/moderation/EulaGate";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import { PageModal } from "@/components/layout/PageModal";
import { FOR_YOU_EVENTS_KEY, fetchForYouEvents } from "@/lib/prefetchEvents";

// Core navigation pages - preloaded for instant navigation (native app feel)
const indexImport = () => import("./pages/Index");
const discoverImport = () => import("./pages/Discover");
const createImport = () => import("./pages/Create");
const chatsImport = () => import("./pages/Chats");
const profileImport = () => import("./pages/Profile");

const Index = lazy(indexImport);
const Discover = lazy(discoverImport);
const Create = lazy(createImport);
const Chats = lazy(chatsImport);
const Profile = lazy(profileImport);

// Secondary pages - lazy loaded with retry on chunk failures
const ChatDetail = lazyWithRetry(() => import("./pages/ChatDetail"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Saved = lazyWithRetry(() => import("./pages/Saved"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));
const PrivacySettings = lazyWithRetry(() => import("./pages/PrivacySettings"));
const EditProfile = lazyWithRetry(() => import("./pages/EditProfile"));
const EventDetail = lazyWithRetry(() => import("./pages/EventDetail"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const YouAreGoing = lazyWithRetry(() => import("./pages/YouAreGoing"));
const BusinessDashboard = lazyWithRetry(() => import("./pages/BusinessDashboard"));
const BusinessSettings = lazyWithRetry(() => import("./pages/BusinessSettings"));
const BusinessPaymentSettings = lazyWithRetry(() => import("./pages/BusinessPaymentSettings"));
const BusinessReservations = lazyWithRetry(() => import("./pages/BusinessReservations"));
const BusinessInfo = lazyWithRetry(() => import("./pages/BusinessInfo"));
const BusinessMenu = lazyWithRetry(() => import("./pages/BusinessMenu"));
const BusinessSales = lazyWithRetry(() => import("./pages/BusinessSales"));
const VenueLayouts = lazyWithRetry(() => import("./pages/VenueLayouts"));
const JoinedEvents = lazyWithRetry(() => import("./pages/JoinedEvents"));
const Help = lazyWithRetry(() => import("./pages/Help"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./pages/TermsOfUse"));
const Referrals = lazyWithRetry(() => import("./pages/Referrals"));

const ReservationConfirmation = lazyWithRetry(() => import("./pages/ReservationConfirmation"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const SpecialInvite = lazyWithRetry(() => import("./pages/SpecialInvite"));
const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe"));
const ScanQR = lazyWithRetry(() => import("./pages/ScanQR"));
const BlockedUsers = lazyWithRetry(() => import("./pages/BlockedUsers"));
const EventPromoterDashboard = lazyWithRetry(() => import("./pages/EventPromoterDashboard"));

// Lazily-imported, but pre-loadable for instant tap response
const eventDetailImport = () => import("./pages/EventDetail");
const userProfileImport = () => import("./pages/UserProfile");

// Preload core routes after initial render for instant navigation.
// Mobile-first: only preload the highest-tap secondary routes (EventDetail
// + UserProfile) so we don't compete with the feed for parse time on 4G.
// On very slow connections (2G/save-data) skip preload entirely.
const preloadCoreRoutes = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn: any = (navigator as any).connection;
  if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") {
    return;
  }
  eventDetailImport();
  userProfileImport();
};

// Configure QueryClient with caching to eliminate refetching on navigation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Preload core routes immediately after mount for native-like navigation
  useEffect(() => {
    // Use requestIdleCallback for non-blocking preload, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCoreRoutes);
    } else {
      setTimeout(preloadCoreRoutes, 100);
    }
    // Initialize Real User Monitoring (LCP/INP/CLS → Supabase)
    import("@/lib/webVitals").then((m) => m.initWebVitals()).catch(() => {});
  }, []);

  // Prefetch first page of For You feed during splash for instant first paint.
  useEffect(() => {
    queryClient.prefetchInfiniteQuery({
      queryKey: FOR_YOU_EVENTS_KEY,
      queryFn: () => fetchForYouEvents().then((items) => ({
        items,
        nextCursor: items.length ? items[items.length - 1].created_at : null,
      })),
      initialPageParam: null as string | null,
      staleTime: 1000 * 60 * 5,
    });
  }, []);

  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>

      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" theme="dark" />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <DeepLinkHandler />
              <OneSignalProvider>
                <NotificationFeedbackProvider>
                  <PushNotificationPrompt>
                    <LocationProvider>
                      <AuthPromptProvider>
                        <AuthPromptModal />
                        <EulaGate>
                        <AppRoutes />
                        </EulaGate>
                        </AuthPromptProvider>
                    </LocationProvider>
                  </PushNotificationPrompt>
                </NotificationFeedbackProvider>
              </OneSignalProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      </LazyMotion>
    </ErrorBoundary>
  );
};

/**
 * Pinterest-style modal routing.
 *
 * When a user opens an event from the feed via `useOpenEvent()`, we navigate
 * to /event/:id but stash the previous location in `state.backgroundLocation`.
 *
 * - The first <Routes> renders the *background* (the feed) so it stays mounted.
 * - The second <Routes> renders the EventDetailModal *on top* when a
 *   backgroundLocation is present.
 *
 * Direct visits to /event/:id (deep links / shared URLs / push notifications)
 * have no backgroundLocation, so only the full <EventDetail/> page renders.
 */
const AppRoutes = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/auth" element={<LazyRoute><Auth /></LazyRoute>} />
        <Route path="/reset-password" element={<LazyRoute><ResetPassword /></LazyRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><ErrorBoundary><LazyRoute><Onboarding /></LazyRoute></ErrorBoundary></ProtectedRoute>} />

        {/* Keep-alive enabled routes - 4 core navigation pages */}
        <Route element={<KeepAliveLayout />}>
          <Route path="/" element={<GuestAllowedRoute><Index /></GuestAllowedRoute>} />
          <Route path="/discover" element={<GuestAllowedRoute><Discover /></GuestAllowedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute requireProfile><MyTickets /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute requireProfile><Profile /></ProtectedRoute>} />
        </Route>

        <Route path="/chats" element={<ProtectedRoute requireProfile><LazyRoute><Chats /></LazyRoute></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute requireProfile><LazyRoute><Create /></LazyRoute></ProtectedRoute>} />

        <Route path="/chats/:id" element={<ProtectedRoute requireProfile><LazyRoute><ChatDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requireProfile><LazyRoute><Settings /></LazyRoute></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute requireProfile><LazyRoute><Saved /></LazyRoute></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute requireProfile><LazyRoute><Notifications /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/privacy" element={<ProtectedRoute requireProfile><LazyRoute><PrivacySettings /></LazyRoute></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute requireProfile><LazyRoute><EditProfile /></LazyRoute></ProtectedRoute>} />

        {/* Public event preview route (full page — used for deep links) */}
        <Route path="/event/:id" element={<LazyRoute><EventDetail /></LazyRoute>} />

        <Route path="/user/:id" element={<GuestAllowedRoute><LazyRoute><UserProfile /></LazyRoute></GuestAllowedRoute>} />
        <Route path="/settings/tickets" element={<Navigate to="/tickets" replace />} />
        <Route path="/going/:id" element={<ProtectedRoute requireProfile><LazyRoute><YouAreGoing /></LazyRoute></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requireProfile><LazyRoute><BusinessDashboard /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business" element={<ProtectedRoute requireProfile><LazyRoute><BusinessSettings /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/payments" element={<ProtectedRoute requireProfile><LazyRoute><BusinessPaymentSettings /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/reservations" element={<ProtectedRoute requireProfile><LazyRoute><BusinessReservations /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/info" element={<ProtectedRoute requireProfile><LazyRoute><BusinessInfo /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/menu" element={<ProtectedRoute requireProfile><LazyRoute><BusinessMenu /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/sales" element={<ProtectedRoute requireProfile><LazyRoute><BusinessSales /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/business/layouts" element={<ProtectedRoute requireProfile><LazyRoute><VenueLayouts /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/joined-events" element={<ProtectedRoute requireProfile><LazyRoute><JoinedEvents /></LazyRoute></ProtectedRoute>} />

        <Route path="/settings/help" element={<ProtectedRoute requireProfile><LazyRoute><Help /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/referrals" element={<ProtectedRoute requireProfile><LazyRoute><Referrals /></LazyRoute></ProtectedRoute>} />
        <Route path="/settings/reservations" element={<Navigate to="/tickets" replace />} />
        <Route path="/reservation/:id" element={<ProtectedRoute><LazyRoute><ReservationConfirmation /></LazyRoute></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
        <Route path="/terms" element={<LazyRoute><TermsOfUse /></LazyRoute>} />
        {/* Public QR scanner route — no auth required, validated by ?key= param */}
        <Route path="/scan/:eventId" element={<LazyRoute><ScanQR /></LazyRoute>} />
        <Route path="/settings/blocks" element={<ProtectedRoute requireProfile><LazyRoute><BlockedUsers /></LazyRoute></ProtectedRoute>} />
        <Route path="/business/event/:eventId/promoters" element={<ProtectedRoute requireProfile><LazyRoute><EventPromoterDashboard /></LazyRoute></ProtectedRoute>} />
        <Route path="/i/:token" element={<LazyRoute><SpecialInvite /></LazyRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
      </Routes>

      {/* Modal routes — render on top when opened from the persistent shell */}
      {backgroundLocation && (
        <Routes>
          <Route path="/event/:id" element={<EventDetailModal />} />
          <Route path="/user/:id" element={<PageModal><LazyRoute><UserProfile /></LazyRoute></PageModal>} />
          <Route path="/notifications" element={<PageModal><LazyRoute><Notifications /></LazyRoute></PageModal>} />
        </Routes>
      )}
    </>
  );
};

export default App;
