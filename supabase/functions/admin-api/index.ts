// Admin-only data API. Every request is authenticated (JWT) and authorized
// (user_roles.role = 'admin') before the service-role client touches any data.
// No RLS policy is loosened anywhere: regular users cannot reach this data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PLATFORM_FEE_BPS = 600;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const num = (v: unknown) => Math.max(0, Number(v) || 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fee/payout for a session, falling back to 6% for legacy rows. */
function feeOf(row: { amount: unknown; platform_fee_amount: unknown; platform_fee_bps: unknown }) {
  if (row.platform_fee_amount != null) return num(row.platform_fee_amount);
  const bps = row.platform_fee_bps != null ? num(row.platform_fee_bps) : PLATFORM_FEE_BPS;
  return round2(num(row.amount) * (bps / 10000));
}
function payoutOf(row: { amount: unknown; payout_amount: unknown; platform_fee_amount: unknown; platform_fee_bps: unknown }) {
  if (row.payout_amount != null) return num(row.payout_amount);
  return round2(num(row.amount) - feeOf(row));
}

function sinceIso(period: string): string | null {
  if (period === "all") return null;
  const days = period === "today" ? 1 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
  if (period === "today") {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function countOf(table: string, since: string | null, column = "created_at", extra?: (q: any) => any) {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (since) q = q.gte(column, since);
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function fetchSessions(since: string | null) {
  const rows: any[] = [];
  const page = 1000;
  for (let from = 0; from < 20000; from += page) {
    let q = admin
      .from("payment_sessions")
      .select(
        "id, amount, status, created_at, confirmed_at, buyer_user_id, business_user_id, event_id, event_area_id, experience_booking_id, quantity, party_size, platform_fee_amount, platform_fee_bps, payout_amount, provider, qhantuy_transaction_id, subscription_business_id, subscription_tier, subscription_interval",
      )
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error) throw new Error(`payment_sessions: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return rows;
}

async function namesFor(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map: Record<string, { full_name: string | null; username: string | null }> = {};
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", ids.slice(i, i + 300));
    (data ?? []).forEach((p: any) => (map[p.id] = { full_name: p.full_name, username: p.username }));
  }
  return map;
}

async function titlesFor(eventIds: string[]) {
  const ids = [...new Set(eventIds.filter(Boolean))];
  const map: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await admin.from("events").select("id, title").in("id", ids.slice(i, i + 300));
    (data ?? []).forEach((e: any) => (map[e.id] = e.title));
  }
  return map;
}

/* ---------------------------------- actions --------------------------------- */

async function overview(period: string) {
  const since = sinceIso(period);

  const [
    usersTotal, usersToday, users7d, users30d,
    businesses, eventsCount, postsCount, experiences,
    likes, comments, saves, reservations, bookings,
  ] = await Promise.all([
    countOf("profiles", null),
    countOf("profiles", sinceIso("today")),
    countOf("profiles", sinceIso("7d")),
    countOf("profiles", sinceIso("30d")),
    countOf("profiles", null, "created_at", (q) => q.eq("is_business", true)),
    countOf("events", since, "created_at", (q) => q.eq("is_post", false).is("deleted_at", null)),
    countOf("events", since, "created_at", (q) => q.eq("is_post", true).is("deleted_at", null)),
    countOf("experiences", since),
    countOf("event_likes", since),
    countOf("event_comments", since),
    countOf("saved_events", since),
    countOf("reservations", since),
    countOf("experience_bookings", since),
  ]);

  const sessions = await fetchSessions(since);
  const confirmedAll = sessions.filter((s) => s.status === "confirmed");
  // Two distinct revenue channels: marketplace sales (Zentro keeps 6%) and
  // business subscriptions (Zentro keeps 100%).
  const confirmed = confirmedAll.filter((s) => !isSubscription(s));
  const subs = confirmedAll.filter(isSubscription);
  const gross = confirmed.reduce((a, s) => a + num(s.amount), 0);
  const commission = confirmed.reduce((a, s) => a + feeOf(s), 0);
  const subscriptionRevenue = subs.reduce((a, s) => a + num(s.amount), 0);

  // Daily trend (gross + commission) for the selected window.
  const byDay: Record<string, { date: string; gross: number; commission: number; orders: number }> = {};
  confirmed.forEach((s) => {
    const date = String(s.confirmed_at ?? s.created_at).slice(0, 10);
    const b = (byDay[date] ||= { date, gross: 0, commission: 0, orders: 0 });
    b.gross += num(s.amount);
    b.commission += feeOf(s);
    b.orders += 1;
  });
  const trend = Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, gross: round2(d.gross), commission: round2(d.commission) }));

  return {
    users: { total: usersTotal, today: usersToday, last7d: users7d, last30d: users30d, businesses },
    content: { events: eventsCount, posts: postsCount, experiences },
    engagement: { likes, comments, saves, reservations, bookings },
    sales: {
      gross: round2(gross),
      commission: round2(commission),
      orders: confirmed.length,
      subscriptionRevenue: round2(subscriptionRevenue),
      subscriptionPayments: subs.length,
      totalRevenue: round2(commission + subscriptionRevenue),
    },
    trend,
  };
}

async function payments(period: string, status: string, search: string) {
  const since = sinceIso(period);
  const all = await fetchSessions(since);
  const confirmed = all.filter((s) => s.status === "confirmed");

  const isExperience = (s: any) => !!s.experience_booking_id;
  const sum = (rows: any[], fn: (s: any) => number) => round2(rows.reduce((a, s) => a + fn(s), 0));

  const gross = sum(confirmed, (s) => num(s.amount));
  const commission = sum(confirmed, feeOf);
  const payouts = sum(confirmed, payoutOf);
  const units = confirmed.reduce((a, s) => a + Math.max(1, num(s.quantity) || num(s.party_size) || 1), 0);

  // Top businesses by gross volume.
  const byBiz: Record<string, { gross: number; commission: number; orders: number }> = {};
  confirmed.forEach((s) => {
    if (!s.business_user_id) return;
    const b = (byBiz[s.business_user_id] ||= { gross: 0, commission: 0, orders: 0 });
    b.gross += num(s.amount);
    b.commission += feeOf(s);
    b.orders += 1;
  });

  // Stuck checkouts: not confirmed and older than 30 minutes.
  const cutoff = Date.now() - 30 * 60000;
  const stuck = all.filter((s) => s.status !== "confirmed" && new Date(s.created_at).getTime() < cutoff);

  // Transaction list (filtered).
  let rows = all;
  if (status && status !== "all") rows = rows.filter((s) => s.status === status);

  const profileMap = await namesFor([
    ...rows.slice(0, 500).flatMap((s) => [s.buyer_user_id, s.business_user_id]),
    ...Object.keys(byBiz),
  ]);
  const eventMap = await titlesFor(rows.slice(0, 500).map((s) => s.event_id));

  let list = rows.slice(0, 500).map((s) => ({
    id: s.id,
    created_at: s.created_at,
    confirmed_at: s.confirmed_at,
    status: s.status,
    kind: isExperience(s) ? "experience" : "ticket",
    amount: round2(num(s.amount)),
    fee: feeOf(s),
    payout: payoutOf(s),
    quantity: Math.max(1, num(s.quantity) || num(s.party_size) || 1),
    provider: s.provider,
    transaction_id: s.qhantuy_transaction_id,
    buyer: profileMap[s.buyer_user_id]?.full_name || profileMap[s.buyer_user_id]?.username || null,
    business: profileMap[s.business_user_id]?.full_name || profileMap[s.business_user_id]?.username || null,
    event: s.event_id ? eventMap[s.event_id] ?? null : null,
  }));

  const term = search.trim().toLowerCase();
  if (term) {
    list = list.filter((r) =>
      [r.buyer, r.business, r.event, r.id, String(r.transaction_id ?? "")]
        .some((v) => (v ?? "").toString().toLowerCase().includes(term)),
    );
  }

  return {
    summary: {
      gross,
      commission,
      payouts,
      orders: confirmed.length,
      units,
      avgOrder: confirmed.length ? round2(gross / confirmed.length) : 0,
      ticketsCommission: sum(confirmed.filter((s) => !isExperience(s)), feeOf),
      experiencesCommission: sum(confirmed.filter(isExperience), feeOf),
      stuck: stuck.length,
    },
    stuck: stuck.slice(0, 25).map((s) => ({
      id: s.id,
      created_at: s.created_at,
      status: s.status,
      amount: round2(num(s.amount)),
    })),
    topBusinesses: Object.entries(byBiz)
      .map(([id, v]) => ({
        id,
        name: profileMap[id]?.full_name || profileMap[id]?.username || id.slice(0, 8),
        gross: round2(v.gross),
        commission: round2(v.commission),
        orders: v.orders,
      }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10),
    transactions: list,
  };
}

async function businesses(search: string) {
  let q = admin
    .from("profiles")
    .select("id, full_name, username, business_type, is_food_business, created_at, city")
    .eq("is_business", true)
    .order("created_at", { ascending: false })
    .limit(500);
  const term = search.trim();
  if (term) q = q.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const list = data ?? [];
  const ids = list.map((b: any) => b.id);

  const [{ data: benes }, { data: subs }] = await Promise.all([
    admin.from("qhantuy_beneficiaries").select("user_id, beneficiary_code").in("user_id", ids),
    admin.from("business_subscriptions").select("business_id, tier, status").in("business_id", ids),
  ]);

  const sessions = await fetchSessions(null);
  const salesBy: Record<string, { gross: number; commission: number }> = {};
  sessions
    .filter((s) => s.status === "confirmed" && s.business_user_id)
    .forEach((s) => {
      const b = (salesBy[s.business_user_id] ||= { gross: 0, commission: 0 });
      b.gross += num(s.amount);
      b.commission += feeOf(s);
    });

  const beneMap = new Set((benes ?? []).filter((b: any) => b.beneficiary_code).map((b: any) => b.user_id));
  const subMap: Record<string, { tier: string; status: string }> = {};
  (subs ?? []).forEach((s: any) => (subMap[s.business_id] = { tier: s.tier, status: s.status }));

  return {
    businesses: list.map((b: any) => ({
      id: b.id,
      name: b.full_name || b.username,
      username: b.username,
      city: b.city,
      type: b.business_type,
      isFood: b.is_food_business,
      created_at: b.created_at,
      payoutsReady: beneMap.has(b.id),
      tier: subMap[b.id]?.tier ?? null,
      subscriptionStatus: subMap[b.id]?.status ?? null,
      gross: round2(salesBy[b.id]?.gross ?? 0),
      commission: round2(salesBy[b.id]?.commission ?? 0),
    })),
  };
}

/* ----------------------------------- entry ---------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action ?? "overview");
    const period = String(body.period ?? "30d");
    const status = String(body.status ?? "all");
    const search = String(body.search ?? "");

    if (action === "whoami") return json({ ok: true, admin: true, email: userData.user.email });
    if (action === "overview") return json(await overview(period));
    if (action === "payments") return json(await payments(period, status, search));
    if (action === "businesses") return json(await businesses(search));
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("[admin-api]", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
