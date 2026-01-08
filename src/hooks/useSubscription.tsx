import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: string | null;
  currentPlan: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

interface SubscriptionContextValue {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidateAndRefresh: () => Promise<void>;
}

const defaultSubscription: SubscriptionStatus = {
  hasActiveSubscription: false,
  subscriptionStatus: null,
  currentPlan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: null,
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// Cache to persist subscription data across mounts
const cache: { data: SubscriptionStatus | null; userId: string | null; timestamp: number } = {
  data: null,
  userId: null,
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Invalidate cache - call this on login or portal interaction
export function invalidateSubscriptionCache() {
  cache.data = null;
  cache.userId = null;
  cache.timestamp = 0;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps): JSX.Element {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(() => {
    if (cache.userId === user?.id && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
      return cache.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (cache.userId === user?.id && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
      return false;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchSubscription = useCallback(async (force = false) => {
    if (!user?.id) {
      setLoading(false);
      setSubscription(null);
      return;
    }

    if (!force && cache.userId === user.id && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
      setSubscription(cache.data);
      setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      const callStatus = async (accessToken: string) => {
        return fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-subscription-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
      };

      if (!session?.access_token) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      let response = await callStatus(session.access_token);

      if (response.status === 401) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        const newToken = refreshed.session?.access_token;
        if (!refreshError && newToken) {
          response = await callStatus(newToken);
        }
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch subscription status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }

      const data: SubscriptionStatus = await response.json();
      
      cache.data = data;
      cache.userId = user.id;
      cache.timestamp = Date.now();
      
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      setSubscription(defaultSubscription);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (cache.userId && cache.userId !== user?.id) {
      cache.data = null;
      cache.userId = null;
      cache.timestamp = 0;
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    await fetchSubscription(true);
  }, [fetchSubscription]);

  const invalidateAndRefresh = useCallback(async () => {
    invalidateSubscriptionCache();
    await fetchSubscription(true);
  }, [fetchSubscription]);

  const value: SubscriptionContextValue = { subscription, loading, error, refresh, invalidateAndRefresh };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    return {
      subscription: defaultSubscription,
      loading: false,
      error: null,
      refresh: async () => {},
      invalidateAndRefresh: async () => {},
      isSubscribed: false,
      currentPlan: null as 'monthly' | 'yearly' | null,
      subscriptionStatus: null as string | null,
      currentPeriodEnd: null as string | null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null as string | null,
    };
  }

  const { subscription, loading, error, refresh, invalidateAndRefresh } = context;
  const sub = subscription ?? defaultSubscription;

  return {
    subscription: sub,
    loading,
    error,
    refresh,
    invalidateAndRefresh,
    isSubscribed: sub.hasActiveSubscription,
    currentPlan: sub.currentPlan,
    subscriptionStatus: sub.subscriptionStatus,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    stripeCustomerId: sub.stripeCustomerId,
  };
}
