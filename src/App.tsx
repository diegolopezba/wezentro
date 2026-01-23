import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OneSignalProvider } from "@/contexts/OneSignalContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NotificationFeedbackProvider } from "@/components/NotificationFeedbackProvider";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { PageLoader } from "@/components/PageLoader";

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Discover = lazy(() => import("./pages/Discover"));
const Create = lazy(() => import("./pages/Create"));
const Chats = lazy(() => import("./pages/Chats"));
const ChatDetail = lazy(() => import("./pages/ChatDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Saved = lazy(() => import("./pages/Saved"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Subscription = lazy(() => import("./pages/Subscription"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Tickets = lazy(() => import("./pages/Tickets"));
const YouAreGoing = lazy(() => import("./pages/YouAreGoing"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const JoinedEvents = lazy(() => import("./pages/JoinedEvents"));
const Help = lazy(() => import("./pages/Help"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache persists
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} minDisplayTime={1200} />}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" theme="dark" />
          <BrowserRouter>
            <DeepLinkHandler />
            <AuthProvider>
              <OneSignalProvider>
                <NotificationFeedbackProvider>
                  <PushNotificationPrompt>
                    <LocationProvider>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Public routes */}
                          <Route path="/auth" element={<Auth />} />
                          
                          
                            {/* Protected routes */}
                            <Route
                              path="/onboarding"
                              element={
                                <ProtectedRoute>
                                  <Onboarding />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Index />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/discover"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Discover />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/create"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Create />
                                </ProtectedRoute>
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
                              path="/chats/:id"
                              element={
                                <ProtectedRoute requireProfile>
                                  <ChatDetail />
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
                            <Route
                              path="/settings"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Settings />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/saved"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Saved />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/notifications"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Notifications />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/notifications"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Notifications />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/subscription"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Subscription />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/checkout-success"
                              element={
                                <ProtectedRoute requireProfile>
                                  <CheckoutSuccess />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/privacy"
                              element={
                                <ProtectedRoute requireProfile>
                                  <PrivacySettings />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/edit-profile"
                              element={
                                <ProtectedRoute requireProfile>
                                  <EditProfile />
                                </ProtectedRoute>
                              }
                            />
                            {/* Public event preview route */}
                            <Route path="/event/:id" element={<EventDetail />} />
                            <Route
                              path="/user/:id"
                              element={
                                <ProtectedRoute requireProfile>
                                  <UserProfile />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/tickets"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Tickets />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/going/:id"
                              element={
                                <ProtectedRoute requireProfile>
                                  <YouAreGoing />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/dashboard"
                              element={
                                <ProtectedRoute requireProfile>
                                  <BusinessDashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/joined-events"
                              element={
                                <ProtectedRoute requireProfile>
                                  <JoinedEvents />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings/help"
                              element={
                                <ProtectedRoute requireProfile>
                                  <Help />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/privacy-policy"
                              element={<PrivacyPolicy />}
                            />
                            <Route
                              path="/terms"
                              element={<TermsOfUse />}
                            />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </LocationProvider>
                  </PushNotificationPrompt>
                </NotificationFeedbackProvider>
              </OneSignalProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
