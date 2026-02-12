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

      // Use public view for other users (hides Stripe billing IDs)
      const { data, error } = await supabase
        .from("subscriptions_public")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      // Map to Subscription type (without sensitive fields)
      return data ? {
        ...data,
        provider: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_start: null,
      } as Subscription : null;
    },
    enabled: !!userId,
  });
};

export const useSubscriptionPlans = (): SubscriptionPlan[] => {
  return [
    {
      id: "free",
      name: "Gratis",
      price: 0,
      interval: "month",
      features: [
        "Explora todos los eventos",
        "Sigue a otros usuarios",
        "Crea eventos y publicaciones",
        "Recibe invitaciones a eventos",
        "Mensajería privada",
        "Cambia a cuenta Business gratis",
      ],
    },
    {
      id: "user_premium",
      name: "Zentro Premium",
      price: 1.99,
      interval: "month",
      features: [
        "Todo lo del plan Gratis",
        "Únete a listas de invitados",
        "Accede a chats grupales de eventos",
        "Notificaciones prioritarias",
        "Código QR para check-ins",
      ],
      highlighted: true,
    },
  ];
};

export const getPlanDisplayName = (planType: string | null | undefined): string => {
  switch (planType) {
    case "user_premium":
      return "Zentro Premium";
    default:
      return "Free";
  }
};
