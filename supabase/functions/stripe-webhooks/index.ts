// Stripe webhook handler for subscription events
// Configure in Stripe dashboard: https://dashboard.stripe.com/webhooks

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
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Get raw body for signature verification
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey);

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer.metadata?.["user_id"]) as string;

        if (!userId) {
          
          break;
        }

        // Extract plan information
        const item = subscription.items.data[0];
        const priceId = item.price.id;
        const plan = priceId.includes("monthly") ? "monthly" : "yearly";

        // Update subscription in database
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: "active",
          current_plan: plan,
          subscription_started_at: new Date(subscription.start_date * 1000),
          subscription_ends_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          next_renewal_date: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        });

        
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer.metadata?.["user_id"]) as string;

        if (!userId) {
          
          break;
        }

        // Extract plan information
        const item = subscription.items.data[0];
        const priceId = item.price.id;
        const plan = priceId.includes("monthly") ? "monthly" : "yearly";

        // Update subscription in database
        await supabase
          .from("subscriptions")
          .update({
            subscription_status: subscription.status as string,
            current_plan: plan,
            subscription_ends_at: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
            next_renewal_date: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
            updated_at: new Date(),
          })
          .eq("user_id", userId);

        
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer.metadata?.["user_id"]) as string;

        if (!userId) {
          
          break;
        }

        // Update subscription status to cancelled
        await supabase
          .from("subscriptions")
          .update({
            subscription_status: "cancelled",
            current_plan: null,
            subscription_ends_at: null,
            updated_at: new Date(),
          })
          .eq("user_id", userId);

        
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer.metadata?.["user_id"]) as string;

        if (!userId) {
          
          break;
        }

        // Record payment in payment history
        await supabase.from("payment_history").insert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          payment_status: "succeeded",
          payment_date: new Date(invoice.created * 1000),
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          paid_at: invoice.paid_date ? new Date(invoice.paid_date * 1000) : null,
        });

        
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer.metadata?.["user_id"]) as string;

        if (!userId) {
          
          break;
        }

        // Record failed payment
        await supabase.from("payment_history").insert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount_paid: invoice.amount_attempted || 0,
          currency: invoice.currency,
          payment_status: "failed",
          payment_date: new Date(invoice.created * 1000),
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          failure_reason: invoice.last_finalization_error?.message || "Unknown error",
        });

        
        break;
      }

      default:
        
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    
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
