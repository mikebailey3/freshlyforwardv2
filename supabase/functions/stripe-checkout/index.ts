import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    // If Stripe is not configured, return fallback so the UI can proceed in dev mode
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ fallback: true, message: "Stripe not configured — proceeding in development mode." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const planSlug: string = body.plan_slug;
    const discountCode: string | null = body.discount_code || null;

    // Fetch the plan from the database
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_enabled", true)
      .eq("is_archived", false)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no Stripe price ID, use fallback
    if (!plan.stripe_price_id) {
      await supabase
        .from("member_profiles")
        .update({ plan_id: plan.id, subscription_status: "active" })
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("member_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id;

    // Initialize Stripe
    const stripe = await import("npm:stripe@17.7.0").then((m) => m.default(stripeSecretKey));

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from("member_profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("user_id", user.id);
    }

    // Validate discount code if provided
    let couponId: string | null = null;
    if (discountCode) {
      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (discount && discount.stripe_coupon_id) {
        couponId = discount.stripe_coupon_id;
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Determine checkout mode: subscription for recurring plans, payment for one-time
    const isRecurring = plan.interval === "month" || plan.interval === "year";
    const mode = isRecurring ? "subscription" : "payment";

    const sessionParams: Record<string, unknown> = {
      customer: stripeCustomerId,
      mode,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/onboarding?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan_slug: plan.slug,
        plan_id: plan.id,
      },
    };

    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    if (isRecurring) {
      sessionParams.subscription_data = {
        metadata: {
          supabase_user_id: user.id,
          plan_slug: plan.slug,
          plan_id: plan.id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams as Stripe.Checkout.SessionCreateParams);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
