import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;
    if (!user.email) throw new Error("User email not available");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sponsored_post_id, amount_usd } = await req.json();
    if (!sponsored_post_id || !amount_usd) throw new Error("Missing sponsored_post_id or amount_usd");

    // Verify post ownership
    const { data: post, error: postError } = await serviceClient
      .from("sponsored_posts")
      .select("id, status, business_user_id")
      .eq("id", sponsored_post_id)
      .single();
    if (postError || !post) throw new Error("Sponsored post not found");
    if (post.business_user_id !== user.id) throw new Error("Unauthorized");
    if (post.status !== "draft" && post.status !== "paused") {
      throw new Error(`Campaign status is '${post.status}', expected draft or paused`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch saved stripe_customer_id from profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId: string | undefined = profile?.stripe_customer_id ?? undefined;

    // Fallback: look up by email if not stored yet
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Persist for future use
        await serviceClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    // If customer has saved payment methods, charge directly (off-session)
    if (customerId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });

      if (paymentMethods.data.length > 0) {
        const pm = paymentMethods.data[0];
        console.log("Charging saved card:", pm.id, "for customer:", customerId);

        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount_usd * 100),
            currency: "usd",
            customer: customerId,
            payment_method: pm.id,
            confirm: true,
            off_session: true,
            description: `Zentro Ad Campaign Budget — post ${sponsored_post_id}`,
            metadata: { sponsored_post_id, user_id: user.id },
          });

          if (paymentIntent.status === "succeeded") {
            // Activate the campaign immediately
            const { error: updateError } = await serviceClient
              .from("sponsored_posts")
              .update({
                status: "active",
                start_date: new Date().toISOString(),
                ad_payment_session_id: paymentIntent.id,
              })
              .eq("id", sponsored_post_id)
              .eq("business_user_id", user.id);

            if (updateError) throw new Error(`Failed to activate: ${updateError.message}`);

            return new Response(
              JSON.stringify({ success: true, method: "direct" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }

          // Payment requires action (3DS) — fall through to checkout
          console.log("PaymentIntent requires action:", paymentIntent.status);
        } catch (stripeErr: any) {
          // Card declined or requires authentication — fall through to checkout
          console.log("Direct charge failed, falling back to checkout:", stripeErr.message);
        }
      }
    }

    // ── Fallback: Stripe Checkout session ──
    const origin = req.headers.get("origin") || "https://wezentro.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      payment_intent_data: {
        setup_future_usage: "off_session", // Save card for next time
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Zentro Ad Campaign Budget",
              description: `Prepaid ad budget — approx. ${Math.round((amount_usd / 5) * 1000).toLocaleString()} impressions at $5 CPM`,
            },
            unit_amount: Math.round(amount_usd * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?ad_activated=${sponsored_post_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
      metadata: { sponsored_post_id, user_id: user.id },
    });

    console.log("Fallback checkout session created:", session.id);

    // Save customer ID if newly created
    if (!customerId && session.customer) {
      await serviceClient
        .from("profiles")
        .update({ stripe_customer_id: String(session.customer) })
        .eq("id", user.id);
    }

    return new Response(
      JSON.stringify({ checkout_url: session.url, method: "checkout" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("charge-boost error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
