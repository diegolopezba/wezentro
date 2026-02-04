import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReferralStats {
  referral_count: number;
  reward_claimed: boolean;
  referral_code: string | null;
  pending_rewards: number;
}

interface ReferredUser {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  payment_completed: boolean;
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("get_referral_stats", {
        _user_id: user.id,
      });

      if (error) throw error;

      // The function returns an array with one row
      const stats = data?.[0] || {
        referral_count: 0,
        reward_claimed: false,
        referral_code: null,
        pending_rewards: 0,
      };

      return stats as ReferralStats;
    },
    enabled: !!user,
  });
}

export function useReferredUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referred-users", user?.id],
    queryFn: async (): Promise<ReferredUser[]> => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("referrals")
        .select(`
          id,
          created_at,
          referred_user_id,
          payment_completed,
          profiles!referrals_referred_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((referral) => ({
        id: referral.referred_user_id,
        username: (referral.profiles as { username: string; avatar_url: string | null })?.username || "usuario",
        avatar_url: (referral.profiles as { username: string; avatar_url: string | null })?.avatar_url,
        created_at: referral.created_at,
        payment_completed: referral.payment_completed || false,
      }));
    },
    enabled: !!user,
  });
}

export function useGenerateReferralCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("generate_referral_code", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-stats", user?.id] });
    },
    onError: (error) => {
      console.error("Error generating referral code:", error);
      toast.error("Error al generar tu código de referido");
    },
  });
}

export function useClaimReferralReward() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      const { data, error } = await supabase.functions.invoke("apply-referral-reward");
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["referral-stats", user?.id] });
      } else {
        toast.info(data.message);
      }
    },
    onError: (error) => {
      console.error("Error claiming reward:", error);
      toast.error("Error al reclamar tu recompensa");
    },
  });
}

export function useProcessReferral() {
  return useMutation({
    mutationFn: async (referralCode: string): Promise<{ success: boolean; message: string }> => {
      const { data, error } = await supabase.functions.invoke("process-referral", {
        body: { referral_code: referralCode },
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Error processing referral:", error);
    },
  });
}
