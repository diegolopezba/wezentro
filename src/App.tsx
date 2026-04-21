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
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { SelectedEventProvider } from "@/contexts/SelectedEventContext";
import { EventDetailOverlay } from "@/components/events/EventDetailOverlay";
import { EulaGate } from "@/components/moderation/EulaGate";
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

// Preload core routes after initial render for instant navigation
const preloadCoreRoutes = () => {
  indexImport();
  discoverImport();
  createImport();
  chatsImport();
  profileImport();
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
                        <SelectedEventProvider>
                        <AuthPromptModal />
                        <EventDetailOverlay />
                        <EulaGate>
                        <Routes>
                          {/* Public routes */}
                          <Route
                            path="/auth"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <Auth />
                              </Suspense>
                            }
                          />

                          {/* Protected onboarding route */}
                          <Route
                            path="/onboarding"
                            element={
                              <ProtectedRoute>
                                <Suspense fallback={<PageLoader />}>
                                  <Onboarding />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          
                          {/* Keep-alive enabled routes - 4 core navigation pages */}
                          <Route element={<KeepAliveLayout />}>
                            <Route
                              path="/"
                              element={
                                <GuestAllowedRoute>
                                  <Index />
                                </GuestAllowedRoute>
                              }
                            />
                            <Route
                              path="/discover"
                              element={
                                <GuestAllowedRoute>
                                  <Discover />
                                </GuestAllowedRoute>
                              }
                            />
                            <Route
                              path="/chats"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Chats />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/profile"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Profile />
                                </ProtectedRoute>
                              }
                            />
                          </Route>

                          {/* Normal routes (no caching) */}
                          <Route
                            path="/create"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Create />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/chats/:id"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <ChatDetail />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Settings />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/saved"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Saved />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/notifications"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Notifications />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/privacy"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <PrivacySettings />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/edit-profile"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <EditProfile />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          {/* Public event preview route */}
                          <Route
                            path="/event/:id"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <EventDetail />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/user/:id"
                            element={
                              <GuestAllowedRoute>
                                <Suspense fallback={<PageLoader />}>
                                  <UserProfile />
                                </Suspense>
                              </GuestAllowedRoute>
                            }
                          />
                          <Route
                            path="/settings/tickets"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Tickets />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/going/:id"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <YouAreGoing />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BusinessDashboard />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/business"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BusinessSettings />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/business/payments"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BusinessPaymentSettings />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/business/reservations"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BusinessReservations />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/business/info"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BusinessInfo />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/joined-events"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <JoinedEvents />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/help"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Help />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/referrals"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <Referrals />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/reservations"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <MyReservations />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/reservation/:id"
                            element={
                              <ProtectedRoute>
                                <Suspense fallback={<PageLoader />}>
                                  <ReservationConfirmation />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/privacy-policy"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <PrivacyPolicy />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/terms"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <TermsOfUse />
                              </Suspense>
                            }
                          />
                          {/* Public QR scanner route — no auth required, validated by ?key= param */}
                          <Route
                            path="/scan/:eventId"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <ScanQR />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/settings/blocks"
                            element={
                              <ProtectedRoute requireProfile>
                                <Suspense fallback={<PageLoader />}>
                                  <BlockedUsers />
                                </Suspense>
                              </ProtectedRoute>
                            }
                          />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route
                            path="*"
                            element={
                              <Suspense fallback={<PageLoader />}>
                                <NotFound />
                              </Suspense>
                            }
                          />
                        </Routes>
                        </EulaGate>
                        </SelectedEventProvider>
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
