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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Stripe webhook not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = await import("npm:stripe@17.7.0").then((m) => m.default(stripeSecretKey));

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency: check if this event was already processed
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEvent) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the event for idempotency
    await supabase.from("stripe_webhook_events").insert({
      id: event.id,
      event_type: event.type,
      payload: event,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer: string;
          subscription: string;
          metadata: { supabase_user_id: string; plan_id: string };
        };
        if (session.metadata?.supabase_user_id) {
          await supabase
            .from("member_profiles")
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: "active",
              plan_id: session.metadata.plan_id || null,
            })
            .eq("user_id", session.metadata.supabase_user_id);

          // Add timeline event
          await supabase.from("career_timeline").insert({
            user_id: session.metadata.supabase_user_id,
            event_type: "membership_activated",
            event_title: "Membership Activated",
            event_description: "Your FreshlyForward membership is now active.",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          customer: string;
          status: string;
          current_period_end: number;
          pause_collection: { behavior: string } | null;
          items: { data: { price: { id: string } }[] };
        };
        const status = subscription.pause_collection ? "paused" : subscription.status;

        // Resync plan_id from the subscription's current price so that plan
        // upgrades/downgrades made via the Stripe billing portal keep the
        // member's feature entitlements (plan_features) in sync.
        const currentPriceId = subscription.items?.data?.[0]?.price?.id;
        const updatePayload: Record<string, unknown> = { subscription_status: status };

        if (currentPriceId) {
          const { data: matchedPlan } = await supabase
            .from("membership_plans")
            .select("id")
            .eq("stripe_price_id", currentPriceId)
            .maybeSingle();
          if (matchedPlan) {
            updatePayload.plan_id = matchedPlan.id;
          }
        }

        await supabase
          .from("member_profiles")
          .update(updatePayload)
          .eq("stripe_customer_id", subscription.customer);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as { customer: string };
        await supabase
          .from("member_profiles")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", subscription.customer);
        break;
      }


    }

    return new Response(JSON.stringify({ received: true }), {
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
