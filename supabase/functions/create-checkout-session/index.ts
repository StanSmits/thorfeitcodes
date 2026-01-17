import Stripe from "https://esm.sh/stripe@13.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateCheckoutRequest {
  priceId: string;
  userId: string;
  email: string;
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
    // Verify authentication - extract and validate JWT token
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
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Create a client to verify the user's token
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: authenticatedUser }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !authenticatedUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { priceId, userId, email } = (await req.json()) as CreateCheckoutRequest;

    // Validate input
    if (!priceId || !userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: priceId, userId, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that the authenticated user matches the requested userId
    if (authenticatedUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: user ID mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey);

    // Initialize Supabase with service role key for database operations
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      throw new Error("Supabase service key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create Stripe customer
    let customerId: string | null = null;

    // Check if user already has a Stripe customer ID in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Create new Stripe customer with full user data
      const customer = await stripe.customers.create({
        email,
        name: profile?.full_name || undefined,
        metadata: {
          user_id: userId,
        },
        // Set Netherlands as default tax location
        address: {
          country: "NL",
        },
        tax_exempt: "none",
      });
      customerId = customer.id;

      // Store customer ID in profiles table
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // Get the public URL for the app (for success/cancel redirects)
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const successUrl = `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
      },
    });

    // Return session ID and full session URL if available
    return new Response(
      JSON.stringify({ sessionId: session.id, sessionUrl: (session.url || null) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
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
