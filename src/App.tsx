import { useState } from "react";
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
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Create from "./pages/Create";
import Chats from "./pages/Chats";
import ChatDetail from "./pages/ChatDetail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Saved from "./pages/Saved";
import Notifications from "./pages/Notifications";
import Subscription from "./pages/Subscription";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PrivacySettings from "./pages/PrivacySettings";
import EditProfile from "./pages/EditProfile";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import UserProfile from "./pages/UserProfile";
import Tickets from "./pages/Tickets";
import YouAreGoing from "./pages/YouAreGoing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
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
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
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
