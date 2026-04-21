import { Suspense, lazy, useState, useEffect } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";

// Wrapper for lazy imports that recovers from chunk-load failures
const lazyWithRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      const hasReloaded = sessionStorage.getItem("chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      }
      sessionStorage.removeItem("chunk_reload");
      return importFn();
    })
  );

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, type Location } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OneSignalProvider } from "@/contexts/OneSignalContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestAllowedRoute } from "@/components/auth/GuestAllowedRoute";
import { NotificationFeedbackProvider } from "@/components/NotificationFeedbackProvider";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { PageLoader } from "@/components/PageLoader";
import { AuthPromptProvider } from "@/hooks/useAuthPrompt";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { KeepAliveLayout } from "@/components/layout/KeepAliveLayout";
import { EulaGate } from "@/components/moderation/EulaGate";
import { EventDetailModal } from "@/components/events/EventDetailModal";
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
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const Tickets = lazyWithRetry(() => import("./pages/Tickets"));
const YouAreGoing = lazyWithRetry(() => import("./pages/YouAreGoing"));
const BusinessDashboard = lazyWithRetry(() => import("./pages/BusinessDashboard"));
const BusinessSettings = lazyWithRetry(() => import("./pages/BusinessSettings"));
const BusinessPaymentSettings = lazyWithRetry(() => import("./pages/BusinessPaymentSettings"));
const BusinessReservations = lazyWithRetry(() => import("./pages/BusinessReservations"));
const BusinessInfo = lazyWithRetry(() => import("./pages/BusinessInfo"));
const JoinedEvents = lazyWithRetry(() => import("./pages/JoinedEvents"));
const Help = lazyWithRetry(() => import("./pages/Help"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./pages/TermsOfUse"));
const Referrals = lazyWithRetry(() => import("./pages/Referrals"));
const MyReservations = lazyWithRetry(() => import("./pages/MyReservations"));
const ReservationConfirmation = lazyWithRetry(() => import("./pages/ReservationConfirmation"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ScanQR = lazyWithRetry(() => import("./pages/ScanQR"));
const BlockedUsers = lazyWithRetry(() => import("./pages/BlockedUsers"));

// Lazily-imported, but pre-loadable for instant tap response
const eventDetailImport = () => import("./pages/EventDetail");
const userProfileImport = () => import("./pages/UserProfile");

// Preload core routes after initial render for instant navigation.
// Includes EventDetail + UserProfile because they're the most-tapped
// secondary routes from the feed (avoids waiting for the JS chunk on tap).
const preloadCoreRoutes = () => {
  indexImport();
  discoverImport();
  createImport();
  chatsImport();
  profileImport();
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
  const [showSplash, setShowSplash] = useState(true);

  // Preload core routes immediately after mount for native-like navigation
  useEffect(() => {
    // Use requestIdleCallback for non-blocking preload, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCoreRoutes);
    } else {
      setTimeout(preloadCoreRoutes, 100);
    }
  }, []);

  // Prefetch event feed data during splash screen so cards appear instantly
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: FOR_YOU_EVENTS_KEY,
      queryFn: fetchForYouEvents,
      staleTime: 1000 * 60 * 5,
    });
  }, []);

  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} minDisplayTime={1200} />}
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

export default App;
