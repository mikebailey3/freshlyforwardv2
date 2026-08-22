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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const featureKey: string = body.feature_key;
    const userId: string = body.user_id || user.id;

    if (!featureKey) {
      return new Response(
        JSON.stringify({ error: "feature_key is required", code: "MISSING_FEATURE_KEY" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the SECURITY DEFINER function to check access server-side
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasAccess, error: rpcError } = await adminSupabase.rpc("has_feature_access", {
      p_user_id: userId,
      p_feature_key: featureKey,
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: "Access check failed", code: "CHECK_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hasAccess) {
      // Determine which plan includes this feature
      const { data: feature } = await adminSupabase
        .from("features")
        .select("display_name, upgrade_title, upgrade_body, upgrade_cta")
        .eq("feature_key", featureKey)
        .maybeSingle();

      // Find the minimum plan that includes this feature
      const { data: planData } = await adminSupabase
        .from("plan_features")
        .select("plan_id, membership_plans(slug, name)")
        .eq("feature_id", feature?.id || "")
        .eq("is_enabled", true);

      const requiredPlan = planData && planData.length > 0
        ? (planData[0] as { plan_id: string; membership_plans: { slug: string; name: string } }).membership_plans.slug
        : null;

      return new Response(
        JSON.stringify({
          has_access: false,
          code: "FEATURE_NOT_INCLUDED",
          feature_key: featureKey,
          required_plan: requiredPlan,
          feature_name: feature?.display_name || null,
          upgrade_title: feature?.upgrade_title || null,
          upgrade_body: feature?.upgrade_body || null,
          upgrade_cta: feature?.upgrade_cta || null,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ has_access: true, feature_key: featureKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
