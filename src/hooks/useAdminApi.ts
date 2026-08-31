import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminPeriod = "today" | "7d" | "30d" | "90d" | "all";

/** Calls the admin-only edge function. Throws on non-admin / auth failures. */
export async function callAdminApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-api", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export interface AdminOverview {
  users: { total: number; today: number; last7d: number; last30d: number; businesses: number };
  content: { events: number; posts: number; experiences: number };
  engagement: { likes: number; comments: number; saves: number; reservations: number; bookings: number };
  sales: { gross: number; commission: number; orders: number };
  trend: { date: string; gross: number; commission: number; orders: number }[];
}

export interface AdminTransaction {
  id: string;
  created_at: string;
  confirmed_at: string | null;
  status: string;
  kind: "ticket" | "experience";
  amount: number;
  fee: number;
  payout: number;
  quantity: number;
  provider: string | null;
  transaction_id: number | null;
  buyer: string | null;
  business: string | null;
  event: string | null;
}

export interface AdminPayments {
  summary: {
    gross: number;
    commission: number;
    payouts: number;
    orders: number;
    units: number;
    avgOrder: number;
    ticketsCommission: number;
    experiencesCommission: number;
    stuck: number;
  };
  stuck: { id: string; created_at: string; status: string; amount: number }[];
  topBusinesses: { id: string; name: string; gross: number; commission: number; orders: number }[];
  transactions: AdminTransaction[];
}

export interface AdminBusiness {
  id: string;
  name: string | null;
  username: string | null;
  city: string | null;
  type: string | null;
  isFood: boolean | null;
  created_at: string;
  payoutsReady: boolean;
  tier: string | null;
  subscriptionStatus: string | null;
  gross: number;
  commission: number;
}

export const useAdminSession = () =>
  useQuery({
    queryKey: ["admin-whoami"],
    retry: false,
    staleTime: 60_000,
    queryFn: () => callAdminApi<{ ok: boolean; email: string }>({ action: "whoami" }),
  });

export const useAdminOverview = (period: AdminPeriod) =>
  useQuery({
    queryKey: ["admin-overview", period],
    staleTime: 60_000,
    queryFn: () => callAdminApi<AdminOverview>({ action: "overview", period }),
  });

export const useAdminPayments = (period: AdminPeriod, status: string, search: string) =>
  useQuery({
    queryKey: ["admin-payments", period, status, search],
    staleTime: 30_000,
    queryFn: () => callAdminApi<AdminPayments>({ action: "payments", period, status, search }),
  });

export const useAdminBusinesses = (search: string) =>
  useQuery({
    queryKey: ["admin-businesses", search],
    staleTime: 60_000,
    queryFn: () => callAdminApi<{ businesses: AdminBusiness[] }>({ action: "businesses", search }),
  });
