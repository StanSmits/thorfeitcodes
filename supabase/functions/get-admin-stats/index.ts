// Get admin dashboard stats with subscription info from Stripe
// Only accessible by moderators and admins

import Stripe from "https://esm.sh/stripe@13.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UserStat {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  today_usage: number;
  last_sign_in: string | null;
  created_at: string;
}

interface AdminStatsResponse {
  users: UserStat[];
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase not configured");
    }

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice("Bearer ".length);

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get claims
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is moderator or admin
    const { data: roleCheck } = await supabaseAdmin.rpc('is_moderator_or_above');
    
    // Also check user_roles table directly as backup
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Only admins can access the dashboard (not moderators)
    const isAdmin = userRoles?.some(r => r.role === 'admin');

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: requires admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id, last_sign_in, created_at')
      .is('deleted_at', null)
      .order('last_sign_in', { ascending: false, nullsFirst: false });

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    // Fetch user roles
    const { data: allRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .is('deleted_at', null);

    // Fetch today's rate limits
    const today = new Date().toISOString().split('T')[0];
    const { data: rateLimits } = await supabaseAdmin
      .from('rate_limits')
      .select('user_id, action_count')
      .eq('action_date', today)
      .eq('action_type', 'copy_rvw');

    // Create lookup maps
    const roleMap = new Map<string, string>();
    allRoles?.forEach(r => {
      // Keep the highest role (admin > moderator > user)
      const current = roleMap.get(r.user_id);
      if (!current || 
          (r.role === 'admin') || 
          (r.role === 'moderator' && current !== 'admin')) {
        roleMap.set(r.user_id, r.role);
      }
    });

    const rateLimitMap = new Map<string, number>();
    rateLimits?.forEach(r => {
      rateLimitMap.set(r.user_id, r.action_count);
    });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey);

    // Collect all customer IDs that exist
    const customerIds = profiles
      ?.filter(p => p.stripe_customer_id)
      .map(p => p.stripe_customer_id) || [];

    // Fetch all subscriptions from Stripe in batches
    const subscriptionMap = new Map<string, {
      status: string;
      plan: string | null;
      currentPeriodEnd: string | null;
    }>();

    // Fetch subscriptions for each customer (Stripe API limitation)
    for (const customerId of customerIds) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId as string,
          status: 'all',
          limit: 1,
          expand: ['data.items.data.price'],
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          let plan: string | null = null;
          const priceItem = sub.items.data[0]?.price;
          if (priceItem?.recurring?.interval === 'month') {
            plan = 'monthly';
          } else if (priceItem?.recurring?.interval === 'year') {
            plan = 'yearly';
          }

          subscriptionMap.set(customerId as string, {
            status: sub.status,
            plan,
            currentPeriodEnd: sub.current_period_end 
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        }
      } catch (stripeErr) {
        console.error(`Error fetching subscription for ${customerId}:`, stripeErr);
        // Continue with other customers
      }
    }

    // Build the response
    const users: UserStat[] = (profiles || []).map(profile => {
      const role = roleMap.get(profile.id) || 'user';
      const todayUsage = rateLimitMap.get(profile.id) || 0;
      
      // Get subscription info from Stripe
      const stripeSubscription = profile.stripe_customer_id 
        ? subscriptionMap.get(profile.stripe_customer_id)
        : null;

      return {
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role,
        subscription_status: stripeSubscription?.status || null,
        subscription_plan: stripeSubscription?.plan || null,
        subscription_expires_at: stripeSubscription?.currentPeriodEnd || null,
        today_usage: todayUsage,
        last_sign_in: profile.last_sign_in,
        created_at: profile.created_at,
      };
    });

    const response: AdminStatsResponse = { users };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        users: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
