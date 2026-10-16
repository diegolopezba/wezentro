import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useReplaceTicketTiers } from "@/hooks/useTicketTiers";
import { entryTotals } from "@/components/business/EventTiersPanel";

const { writes, from } = vi.hoisted(() => ({ writes: [] as any[], from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

beforeEach(() => {
  writes.length = 0;
  from.mockImplementation(() => {
    const write: any = { filters: [] };
    const chain: any = {
      update: (row: any) => { write.action = "update"; write.row = row; writes.push(write); return chain; },
      insert: (row: any) => { write.action = "insert"; write.row = row; writes.push(write); return chain; },
      delete: () => { throw new Error("Tier deletion must never happen"); },
      eq: (key: string, value: any) => { write.filters.push([key, value]); return chain; },
      not: (key: string, op: string, value: any) => { write.exclude = [key, op, value]; return chain; },
      select: () => chain,
      single: async () => ({ data: { ...write.row, id: write.filters.find(([k]: string[]) => k === "id")?.[1] ?? "new-tier", sold_count: 9 }, error: null }),
      then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
    };
    return chain;
  });
});

describe("ticket edit preservation", () => {
  it("renames Fase 1 without replacing its ID or 9 sold passes, while inserting a new type", async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useReplaceTicketTiers(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    let saved: any;
    await act(async () => {
      saved = await result.current.mutateAsync({ eventId: "scz", sequential: true, tiers: [
        { id: "fase-1", name: "Fase 1 renamed", price: 400, display_order: 0, valid_day: null },
        { name: "Día 2", price: 250, display_order: 1, valid_day: 2 },
      ] });
    });
    expect(saved[0].id).toBe("fase-1");
    expect(saved[0].sold_count).toBe(9);
    expect(writes[0].action).toBe("update");
    expect(writes[0].filters).toEqual([["event_id", "scz"], ["id", "fase-1"]]);
    expect(writes[0].row).not.toHaveProperty("sold_count");
    expect(writes[1].action).toBe("insert");
    expect(writes[1].row.unlock_after_tier_id).toBe("fase-1");
    expect(writes[1].row.valid_day).toBe(2);
    expect(writes[2].row).toEqual({ is_active: false });
    expect(writes[2].exclude).toEqual(["id", "in", "(fase-1,new-tier)"]);
  });

  it("switching to single price archives tiers rather than deleting sales history", async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useReplaceTicketTiers(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await act(async () => { await result.current.mutateAsync({ eventId: "scz", tiers: [], sequential: false }); });
    expect(writes).toHaveLength(1);
    expect(writes[0].row).toEqual({ is_active: false });
    expect(writes[0].filters).toContainEqual(["event_id", "scz"]);
  });

  it("adds 9 sold passes and accepted invitations once, not every daily invitation QR", () => {
    const category = { key: "x", name: "x", price: 400, capacity: null, checked_in: 0, revenue: 3600 };
    expect(entryTotals({ categories: [
      { ...category, kind: "tier", count: 9 },
      { ...category, kind: "special", count: 4 },
    ], invites: { sent: 3, accepted: 3, pending: 0, revoked: 0, checked_in: 0 } })).toEqual({ sold: 9, invited: 3, manual: 0, total: 12 });
  });
});