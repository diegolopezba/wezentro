import { useAuth } from "@/contexts/AuthContext";

/**
 * True when the signed-in account was created as (or migrated to) a Business
 * account. Business accounts get the management nav and cannot buy/reserve.
 */
export const useIsBusinessAccount = (): boolean => {
  const { profile } = useAuth();
  if (!profile) return false;
  return (profile as any).account_type === "business" || profile.is_business === true;
};
