import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Use service role to fetch user info reliably
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user using anon client + token
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      throw new Error("Not authenticated");
    }

    const user = userData.user;
    if (!user.email) throw new Error("User email not available");

    const { sponsored_post_id, amount_usd } = await req.json();
    if (!sponsored_post_id || !amount_usd) throw new Error("Missing sponsored_post_id or amount_usd");

    console.log("Creating checkout for post:", sponsored_post_id, "amount:", amount_usd, "user:", user.id);

    // Verify the sponsored post belongs to this user (use service role to bypass RLS)
    const { data: post, error: postError } = await serviceClient
      .from("sponsored_posts")
      .select("id, status, business_user_id")
      .eq("id", sponsored_post_id)
      .single();

    if (postError || !post) {
      console.error("Post error:", postError);
      throw new Error("Sponsored post not found");
    }
    if (post.business_user_id !== user.id) throw new Error("Unauthorized");
    if (post.status !== "draft" && post.status !== "paused") {
      throw new Error(`Campaign status is '${post.status}', expected draft or paused`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://wezentro.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      payment_intent_data: {
        setup_future_usage: "off_session", // Saves card for direct charging on next boost
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
      metadata: {
        sponsored_post_id,
        user_id: user.id,
      },
    });

    console.log("Checkout session created:", session.id);

    // Persist customer ID to profile for future saved-card charges
    const newCustomerId = session.customer ?? customerId;
    if (newCustomerId) {
      await serviceClient
        .from("profiles")
        .update({ stripe_customer_id: String(newCustomerId) })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
