import { motion } from "framer-motion";
import { ChevronLeft, Check, Crown, Sparkles, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserSubscription, useSubscriptionPlans, getPlanDisplayName } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const Subscription = () => {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useUserSubscription();
  const plans = useSubscriptionPlans();

  const currentPlanId = subscription?.plan_type || "free";
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  const handleUpgrade = (planId: string) => {
    toast.info("Stripe payments coming soon!", {
      description: "We're working on integrating payments. Stay tuned!",
    });
  };

  const handleManageSubscription = () => {
    toast.info("Subscription management coming soon!", {
      description: "You'll be able to manage your subscription here.",
    });
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "user_premium":
        return <Star className="h-5 w-5" />;
      case "business_premium":
        return <Crown className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trial</Badge>;
      case "canceled":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Canceled</Badge>;
      case "past_due":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Past Due</Badge>;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Subscription</h1>
          </div>
        </div>

        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          {/* Current Plan Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
            
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20 text-primary">
                    {getPlanIcon(currentPlanId)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {getPlanDisplayName(currentPlanId)}
                      </span>
                      {subscription && getStatusBadge(subscription.status)}
                    </div>
                    {subscription?.current_period_end && isActive && (
                      <p className="text-sm text-muted-foreground">
                        Renews on {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                {subscription && isActive && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleManageSubscription}
                  >
                    Manage Subscription
                  </Button>
                )}
              </div>
            )}
          </motion.div>

          {/* Available Plans */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Available Plans</h2>
            
            {plans.map((plan, index) => {
              const isCurrentPlan = currentPlanId === plan.id;
              const isPremium = plan.id !== "free";
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl border p-6 transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-primary/10 via-card/50 to-card/50 border-primary/30"
                      : "bg-card/50 border-border/50"
                  } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        isPremium ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {getPlanIcon(plan.id)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-muted-foreground">
                          {plan.price === 0 ? (
                            "Free forever"
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-foreground">
                                ${plan.price.toFixed(2)}
                              </span>
                              <span className="text-sm">/{plan.interval}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {isCurrentPlan && (
                      <Badge variant="outline" className="border-primary text-primary">
                        Current
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {!isCurrentPlan && (
                    <Button
                      className={`w-full ${
                        plan.highlighted
                          ? "bg-primary hover:bg-primary/90"
                          : ""
                      }`}
                      variant={plan.highlighted ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {plan.price === 0 ? "Downgrade to Free" : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* FAQ or Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-card/30 border border-border/30 p-4 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Cancel anytime. No long-term commitments.
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Subscription;
