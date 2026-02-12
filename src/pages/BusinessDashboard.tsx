import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, UserCheck, UsersRound, BarChart3, TrendingUp, Repeat } from "lucide-react";
import { PromocionesSection } from "@/components/dashboard/PromocionesSection";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useOverviewStats,
  useEventPerformance,
  useGuestlistFunnel,
  useGuestlistStatusBreakdown,
  useRepeatAttendees,
} from "@/hooks/useBusinessAnalytics";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EventsPerformanceTable } from "@/components/dashboard/EventsPerformanceTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";

// Lazy load heavy chart components
const GuestlistFunnel = lazy(() => import("@/components/dashboard/GuestlistFunnel").then(m => ({ default: m.GuestlistFunnel })));
const StatusPieChart = lazy(() => import("@/components/dashboard/StatusPieChart").then(m => ({ default: m.StatusPieChart })));
const EngagementChart = lazy(() => import("@/components/dashboard/EngagementChart").then(m => ({ default: m.EngagementChart })));

const ChartSkeleton = () => (
  <div className="h-64 bg-secondary/50 rounded-xl animate-pulse" />
);

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  useSwipeBack();

  const isBusiness = profile?.is_business === true;
  const subLoading = !profile;

  // Fetch analytics data
  const { data: overviewStats, isLoading: statsLoading } = useOverviewStats();
  const { data: eventPerformance, isLoading: eventsLoading } = useEventPerformance();
  const { data: funnelData, isLoading: funnelLoading } = useGuestlistFunnel();
  const { data: statusBreakdown, isLoading: statusLoading } = useGuestlistStatusBreakdown();
  const { data: repeatData, isLoading: repeatLoading } = useRepeatAttendees();

  // Show upsell for non-business users
  if (!subLoading && !isBusiness) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 safe-top">
          <div className="flex items-center gap-3 px-4 py-4 bg-background">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">Business Dashboard</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-brand text-2xl font-bold text-foreground mb-2">
              Business Dashboard
            </h2>
            <p className="text-muted-foreground mb-6">
              Activa tu cuenta Business en Configuración para acceder a analíticas, métricas de eventos e insights de audiencia — es gratis.
            </p>
            <Button
              variant="premium"
              size="lg"
              className="w-full"
              onClick={() => navigate("/settings")}
            >
              Ir a Configuración
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Business Dashboard</h1>
        </div>
      </header>

      <div className="px-4 space-y-6 mt-4">
        {/* Promociones - Sponsored Posts */}
        <PromocionesSection />

        {/* Overview Stats */}
        <section>
          <h2 className="font-brand text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              title="Total Events"
              value={statsLoading ? "..." : overviewStats?.totalEvents || 0}
              icon={Calendar}
              delay={0}
            />
            <StatsCard
              title="Guestlist Signups"
              value={statsLoading ? "..." : overviewStats?.totalGuestlistSignups || 0}
              icon={Users}
              delay={0.1}
            />
            <StatsCard
              title="Total Check-ins"
              value={statsLoading ? "..." : overviewStats?.totalCheckIns || 0}
              icon={UserCheck}
              delay={0.2}
            />
            <StatsCard
              title="Followers"
              value={statsLoading ? "..." : overviewStats?.totalFollowers || 0}
              icon={UsersRound}
              delay={0.3}
            />
          </div>
        </section>

        {/* Repeat Attendees */}
        {repeatData && repeatData.totalUniqueAttendees > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{repeatData.repeatPercentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    Repeat Attendees ({repeatData.repeatAttendees} of {repeatData.totalUniqueAttendees})
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Event Performance */}
        <section>
          <h2 className="font-brand text-lg font-semibold text-foreground mb-3">
            Event Performance
          </h2>
          <div className="rounded-2xl bg-card border border-border p-4">
            <EventsPerformanceTable
              events={eventPerformance || []}
              isLoading={eventsLoading}
            />
          </div>
        </section>

        {/* Engagement Chart - Lazy loaded */}
        <section>
          <h2 className="font-brand text-lg font-semibold text-foreground mb-3">
            Event Comparison
          </h2>
          <div className="rounded-2xl bg-card border border-border p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <EngagementChart
                events={eventPerformance || []}
                isLoading={eventsLoading}
              />
            </Suspense>
          </div>
        </section>

        {/* Guestlist Analytics - Lazy loaded */}
        <section>
          <h2 className="font-brand text-lg font-semibold text-foreground mb-3">
            Guestlist Funnel
          </h2>
          <div className="rounded-2xl bg-card border border-border p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <GuestlistFunnel data={funnelData} isLoading={funnelLoading} />
            </Suspense>
          </div>
        </section>

        {/* Status Breakdown - Lazy loaded */}
        <section>
          <h2 className="font-brand text-lg font-semibold text-foreground mb-3">
            Request Status Breakdown
          </h2>
          <div className="rounded-2xl bg-card border border-border p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <StatusPieChart data={statusBreakdown} isLoading={statusLoading} />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BusinessDashboard;
