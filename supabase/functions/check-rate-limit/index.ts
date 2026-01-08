// Backend rate limiting for free users
// Checks and enforces daily limits when subscription_enabled is true
// Uses profiles.stripe_customer_id to check Stripe subscription status

import Stripe from "https://esm.sh/stripe@13.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 5;

interface RateLimitRequest {
  userId: string;
  feature: string; // 'generator' | 'search' | etc.
  increment?: boolean; // Whether to increment the counter
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  isSubscriber: boolean;
  subscriptionEnabled: boolean;
}

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
    const { userId, feature, increment = false } = (await req.json()) as RateLimitRequest;

    if (!userId || !feature) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, feature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if subscription system is enabled
    const { data: settings } = await supabase.rpc("get_app_settings");
    const subscriptionEnabled = settings?.subscription_enabled === true;

    // If subscriptions are disabled, allow unlimited access
    if (!subscriptionEnabled) {
      const response: RateLimitResponse = {
        allowed: true,
        remaining: -1, // -1 indicates unlimited
        limit: -1,
        resetAt: "",
        isSubscriber: false,
        subscriptionEnabled: false,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's stripe_customer_id from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let isSubscriber = false;

    // If user has a stripe_customer_id, check Stripe for active subscription
    if (profile?.stripe_customer_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey);
          const subscriptions = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "active",
            limit: 1,
          });
          isSubscriber = subscriptions.data.length > 0;
        } catch (stripeError) {
          console.error("Error checking Stripe subscription:", stripeError);
        }
      }
    }

    // Subscribers have unlimited access
    if (isSubscriber) {
      const response: RateLimitResponse = {
        allowed: true,
        remaining: -1, // -1 indicates unlimited
        limit: -1,
        resetAt: "",
        isSubscriber: true,
        subscriptionEnabled: true,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For free users, check rate limit from rate_limits table
    const { data: rateLimitData } = await supabase.rpc('get_rate_limit_status', {
      p_user_id: userId,
      p_action_type: feature === 'generator' ? 'copy_rvw' : feature,
    });

    const rateLimit = rateLimitData?.[0];
    const remaining = rateLimit?.remaining ?? DAILY_LIMIT;
    const allowed = remaining > 0;

    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const response: RateLimitResponse = {
      allowed,
      remaining,
      limit: DAILY_LIMIT,
      resetAt: tomorrowStart.toISOString(),
      isSubscriber: false,
      subscriptionEnabled: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Rate limit check error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
