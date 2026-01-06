/**
 * Stripe Webhook Handler
 * This file contains utilities for handling Stripe webhook events
 * 
 * Webhook events to handle:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface StripeWebhookEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: string;
}

/**
 * Verify Stripe webhook signature
 * Should be called to ensure the webhook came from Stripe
 */
export function verifyStripeWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string
): StripeWebhookEvent | null {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return event as StripeWebhookEvent;
  } catch (error) {
    
    return null;
  }
}

/**
 * Handle customer.subscription.created event
 * Called when a new subscription is created
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  updateUserSubscription: (userId: string, data: any) => Promise<void>
): Promise<void> {
  const customerId = subscription.customer as string;
  
  // Get customer metadata to find user ID
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.['user_id']) as string;

  if (!userId) {
    
    return;
  }

  // Extract plan information
  const item = subscription.items.data[0];
  const priceId = item.price.id;
  const plan = priceId.includes('monthly') ? 'monthly' : 'yearly';

  // Update user subscription status in database
  await updateUserSubscription(userId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: 'active',
    current_plan: plan,
    subscription_started_at: new Date(subscription.start_date * 1000),
    subscription_ends_at: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  });

  
}

/**
 * Handle customer.subscription.updated event
 * Called when subscription details change
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  updateUserSubscription: (userId: string, data: any) => Promise<void>
): Promise<void> {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.['user_id']) as string;

  if (!userId) {
    
    return;
  }

  // Extract plan information
  const item = subscription.items.data[0];
  const priceId = item.price.id;
  const plan = priceId.includes('monthly') ? 'monthly' : 'yearly';

  // Update user subscription status in database
  await updateUserSubscription(userId, {
    subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
    current_plan: plan,
    subscription_ends_at: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  });

  
}

/**
 * Handle customer.subscription.deleted event
 * Called when a subscription is cancelled
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  updateUserSubscription: (userId: string, data: any) => Promise<void>
): Promise<void> {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.['user_id']) as string;

  if (!userId) {
    
    return;
  }

  // Update user subscription status in database
  await updateUserSubscription(userId, {
    subscription_status: 'cancelled',
    current_plan: null,
    subscription_ends_at: null,
  });

  
}

/**
 * Handle invoice.payment_succeeded event
 * Called when a payment is successfully processed
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  updateUserInvoice: (userId: string, data: any) => Promise<void>
): Promise<void> {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.['user_id']) as string;

  if (!userId) {
    
    return;
  }

  // Store invoice data if needed
  await updateUserInvoice(userId, {
    stripe_invoice_id: invoice.id,
    amount_paid: invoice.paid ? invoice.amount_paid : 0,
    paid_at: invoice.paid_date ? new Date(invoice.paid_date * 1000) : null,
  });

  
}

/**
 * Handle invoice.payment_failed event
 * Called when a payment fails
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  updateUserInvoice: (userId: string, data: any) => Promise<void>
): Promise<void> {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.['user_id']) as string;

  if (!userId) {
    
    return;
  }

  // Store failed payment attempt
  await updateUserInvoice(userId, {
    stripe_invoice_id: invoice.id,
    payment_failed: true,
    failure_reason: invoice.last_finalization_error?.message || 'Unknown error',
  });

  
}
