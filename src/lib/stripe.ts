import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const getStripe = () => stripePromise;

export const STRIPE_PRODUCTS = {
  MONTHLY: {
    id: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || "price_test_monthly",
    name: "Monthly Plan",
    price: 4.99,
    currency: "eur",
    interval: "month",
  },
  YEARLY: {
    id: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || "price_test_yearly",
    name: "Annual Plan",
    price: 49.99,
    currency: "eur",
    interval: "year",
  },
};

export const createCheckoutSession = async (
  priceId: string,
  userId: string,
  email: string
) => {
  // Use Supabase Edge Function endpoint
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const endpoint = `${supabaseUrl}/functions/v1/create-checkout-session`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      priceId,
      userId,
      email,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create checkout session");
  }

  const json = await response.json();
  // Prefer the full session URL (contains required init params); fall back to sessionId
  return json.sessionUrl || json.sessionId;
};

export const redirectToCheckout = async (sessionRef: string) => {
  if (!sessionRef) throw new Error("No session reference provided");

  // If the function returned a full URL, use it. Otherwise treat as sessionId.
  const checkoutUrl = sessionRef.startsWith("http")
    ? sessionRef
    : `https://checkout.stripe.com/pay/${sessionRef}`;

  setTimeout(() => {
    window.location.href = checkoutUrl;
  }, 100);
};
