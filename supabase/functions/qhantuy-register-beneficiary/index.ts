import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, json, qhantuyFetch, checkBeneficiaries, isDuplicateCiError } from "../_shared/qhantuy.ts";

const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  ci_number: z.string().trim().min(3).max(30),
  email: z.string().trim().email().max(255),
  bank_id: z.number().int().positive(),
  bank_name: z.string().trim().max(120).optional(),
  account_number: z.string().trim().min(3).max(50),
  account_type: z.enum(["Caja de Ahorro", "Cuenta corriente", "AHORROS", "CORRIENTE", "ahorros", "corriente", "Ahorros", "Corriente"]),
});

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
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", detail: parsed.error.flatten().fieldErrors }, 400);
    }
    const b = parsed.data;
    const accountType = b.account_type.toLowerCase().includes("corriente") ? "Cuenta corriente" : "Caja de Ahorro";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check if user already has one — reject (they should edit instead).
    const { data: existing } = await supabase
      .from("qhantuy_beneficiaries")
      .select("beneficiary_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return json({ error: "Ya tienes una cuenta bancaria registrada" }, 409);

    const res = await qhantuyFetch("/create-beneficiary", {
      method: "POST",
      body: JSON.stringify({
        first_name: b.first_name,
        last_name: b.last_name,
        ci_number: Number(b.ci_number),
        email: b.email,
        bank_id: b.bank_id,
        account_number: b.account_number,
        account_type: accountType,
      }),
    });

    if (!res.ok) {
      console.error("register-beneficiary failed:", res.status, res.raw);
      return json({ error: "No se pudo registrar la cuenta bancaria", detail: res.data }, 502);
    }

    if (res.data?.process === false) {
      console.error("register-beneficiary rejected:", res.raw);
      return json({ error: res.data?.message || "No se pudo registrar la cuenta bancaria" }, 400);
    }

    const beneficiaryCode =
      res.data?.beneficiary_code ??
      res.data?.data?.beneficiary_code ??
      res.data?.code ??
      res.data?.beneficiaryCode;

    if (!beneficiaryCode) {
      console.error("register-beneficiary no code in response:", res.raw);
      return json({ error: "Respuesta inválida de Qhantuy" }, 502);
    }

    const { error: insErr } = await supabase.from("qhantuy_beneficiaries").insert({
      user_id: userId,
      beneficiary_code: String(beneficiaryCode),
      first_name: b.first_name,
      last_name: b.last_name,
      ci_number: b.ci_number,
      email: b.email,
      bank_id: b.bank_id,
      bank_name: b.bank_name ?? null,
      account_number: b.account_number,
      account_type: accountType,
      is_active: true,
    });
    if (insErr) {
      console.error("Failed to persist beneficiary:", insErr);
      return json({ error: "No se pudo guardar la cuenta" }, 500);
    }

    return json({ ok: true, beneficiary_code: String(beneficiaryCode) });
  } catch (err) {
    console.error("qhantuy-register-beneficiary error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
