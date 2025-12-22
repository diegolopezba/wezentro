import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  provider: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  highlighted?: boolean;
}

export const useUserSubscription = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });
};

export const useUserSubscriptionById = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["subscription", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!userId,
  });
};

export const useSubscriptionPlans = (): SubscriptionPlan[] => {
  return [
    {
      id: "free",
      name: "Free",
      price: 0,
      interval: "month",
      features: [
        "Browse all events",
        "Follow users",
        "Create events (no guestlist)",
        "Receive event invitations",
        "Private messaging",
      ],
    },
    {
      id: "user_premium",
      name: "Zentro Premium",
      price: 4.20,
      interval: "month",
      features: [
        "Everything in Free",
        "Join event guestlists",
        "Access guestlist group chats",
        "Priority event notifications",
        "QR code for check-ins",
      ],
      highlighted: true,
    },
    {
      id: "business_premium",
      name: "Zentro Business",
      price: 19.99,
      interval: "month",
      features: [
        "Everything in Zentro Premium",
        "Create events with guestlists",
        "Set guestlist capacity limits",
        "View event analytics",
        "Scan QR codes for check-ins",
        "Promote events to more users",
      ],
    },
  ];
};

export const getPlanDisplayName = (planType: string | null | undefined): string => {
  switch (planType) {
    case "user_premium":
      return "Zentro Premium";
    case "business_premium":
      return "Zentro Business";
    default:
      return "Free";
  }
};
