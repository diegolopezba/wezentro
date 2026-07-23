import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, qhantuyFetch } from "../_shared/qhantuy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existing } = await supabase
      .from("qhantuy_beneficiaries")
      .select("beneficiary_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) return json({ ok: true });

    const res = await qhantuyFetch("/delete-beneficiary", {
      method: "POST",
      body: JSON.stringify({ beneficiary_code: existing.beneficiary_code }),
    });
    if (!res.ok) {
      console.error("delete-beneficiary remote failed:", res.status, res.raw);
      // continue and delete locally anyway
    }

    await supabase.from("qhantuy_beneficiaries").delete().eq("user_id", userId);
    return json({ ok: true });
  } catch (err) {
    console.error("qhantuy-delete-beneficiary error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
