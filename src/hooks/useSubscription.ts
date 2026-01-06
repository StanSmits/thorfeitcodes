import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'active' | 'past_due' | 'unpaid' | 'trialing' | 'cancelled' | null;
  current_plan: 'monthly' | 'yearly' | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  next_renewal_date: string | null;
  total_paid_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No rows returned - user has no subscription
            setSubscription(null);
          } else {
            throw fetchError;
          }
        } else {
          setSubscription(data as Subscription);
        }
      } catch (err) {
        
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return {
    subscription,
    loading,
    error,
    isSubscribed: subscription?.subscription_status === 'active',
    currentPlan: subscription?.current_plan,
  };
}
