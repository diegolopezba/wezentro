/**
 * ONE-OFF setup helper: registers (or adopts) Zentro's own Qhantuy beneficiary
 * and returns its beneficiary code. Delete after use.
 *
 * Protected by a shared secret header to avoid public invocation:
 *   X-Setup-Key must match the PLATFORM_SETUP_KEY secret.
 */
import { corsHeaders, json, qhantuyFetch, checkBeneficiaries, isDuplicateCiError } from "../_shared/qhantuy.ts";

const ZENTRO = {
  first_name: "Gerardo Diego",
  last_name: "Lopez Barrientos",
  ci_number: 6244221,
  email: "diegolopezzin@gmail.com",
  bank_id: 9, // BANCO MERCANTIL SANTA CRUZ S.A.
  account_number: "1007026017",
  account_type: "Caja de Ahorro",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("PLATFORM_SETUP_KEY");
  if (!key || req.headers.get("X-Setup-Key") !== key) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    // Already registered under our merchant? Adopt it.
    const existing = await checkBeneficiaries();
    const match = existing.find(
      (it) => String(it.ci_number).trim() === String(ZENTRO.ci_number),
    );
    if (match) {
      // Keep Qhantuy in sync if the bank data changed.
      const needsEdit =
        String(match.account_number) !== ZENTRO.account_number ||
        Number(match.bank_id) !== ZENTRO.bank_id ||
        String(match.account_type).toLowerCase() !== ZENTRO.account_type.toLowerCase();
      if (needsEdit) {
        const edit = await qhantuyFetch("/edit-beneficiary", {
          method: "POST",
          body: JSON.stringify({ beneficiary_code: match.beneficiary_code, ...ZENTRO }),
        });
        if (!edit.ok || edit.data?.process === false) {
          console.error("platform beneficiary edit failed:", edit.status, edit.raw);
          return json({ error: "Edit failed", detail: edit.data }, 502);
        }
      }
      return json({ ok: true, adopted: true, beneficiary_code: String(match.beneficiary_code) });
    }

    const res = await qhantuyFetch("/create-beneficiary", {
      method: "POST",
      body: JSON.stringify(ZENTRO),
    });

    if (!res.ok || res.data?.process === false) {
      if (res.data && isDuplicateCiError(res.data)) {
        const items = await checkBeneficiaries();
        const m = items.find((it) => String(it.ci_number).trim() === String(ZENTRO.ci_number));
        if (m) return json({ ok: true, adopted: true, beneficiary_code: String(m.beneficiary_code) });
      }
      console.error("platform beneficiary create failed:", res.status, res.raw);
      return json({ error: "Create failed", detail: res.data }, 502);
    }

    const code =
      res.data?.beneficiary_code ?? res.data?.data?.beneficiary_code ??
      res.data?.code ?? res.data?.beneficiaryCode;
    if (!code) {
      console.error("platform beneficiary: no code in response:", res.raw);
      return json({ error: "No beneficiary code in response" }, 502);
    }
    return json({ ok: true, adopted: false, beneficiary_code: String(code) });
  } catch (err) {
    console.error("qhantuy-platform-setup error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
