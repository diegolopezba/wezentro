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
      name: "Gratis",
      price: 0,
      interval: "month",
      features: [
        "Explora todos los eventos",
        "Sigue a otros usuarios",
        "Crea eventos (sin lista de invitados)",
        "Recibe invitaciones a eventos",
        "Mensajería privada",
      ],
    },
    {
      id: "user_premium",
      name: "Zentro Premium",
      price: 4.20,
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
    {
      id: "food_premium",
      name: "Zentro Food",
      price: 12.99,
      interval: "month",
      features: [
        "Todo lo de Zentro Premium",
        "Transforma tu perfil en restaurante o café",
        "Crea y muestra tu menú",
        "Insignia de comida en tu perfil",
        "Aparece en el filtro de Restaurante/Café del mapa",
      ],
    },
    {
      id: "business_premium",
      name: "Zentro Business",
      price: 29.99,
      interval: "month",
      features: [
        "Todo lo de Zentro Premium",
        "Crea eventos con lista de invitados",
        "Establece límites de capacidad",
        "Ve analíticas de tus eventos",
        "Escanea códigos QR para check-ins",
        "Promociona eventos a más usuarios",
      ],
    },
  ];
};

export const getPlanDisplayName = (planType: string | null | undefined): string => {
  switch (planType) {
    case "user_premium":
      return "Zentro Premium";
    case "food_premium":
      return "Zentro Food";
    case "business_premium":
      return "Zentro Business";
    default:
      return "Free";
  }
};
