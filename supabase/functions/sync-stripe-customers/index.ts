import Stripe from "https://esm.sh/stripe@13.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Verify the user's token
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using the has_role function with user's ID
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey);

    // Fetch all profiles with stripe_customer_id
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id")
      .not("stripe_customer_id", "is", null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No customers to sync", updated: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Update each Stripe customer
    for (const profile of profiles) {
      try {
        await stripe.customers.update(profile.stripe_customer_id, {
          name: profile.full_name || undefined,
          email: profile.email,
          address: {
            country: "NL",
          },
          tax_exempt: "none",
        });
        results.updated++;
        console.log(`Updated customer ${profile.stripe_customer_id} for user ${profile.id}`);
      } catch (err) {
        const errorMsg = `Failed to update ${profile.stripe_customer_id}: ${err instanceof Error ? err.message : "Unknown error"}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sync complete. Updated ${results.updated} customers.`,
        total: profiles.length,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing Stripe customers:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
