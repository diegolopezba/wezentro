import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NotificationFeedbackProvider } from "@/components/NotificationFeedbackProvider";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Create from "./pages/Create";
import Chats from "./pages/Chats";
import ChatDetail from "./pages/ChatDetail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Subscription from "./pages/Subscription";
import EditProfile from "./pages/EditProfile";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <NotificationFeedbackProvider>
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
                path="/edit-profile"
                element={
                  <ProtectedRoute requireProfile>
                    <EditProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/event/:id"
                element={
                  <ProtectedRoute requireProfile>
                    <EventDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/:id"
                element={
                  <ProtectedRoute requireProfile>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LocationProvider>
          </NotificationFeedbackProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
