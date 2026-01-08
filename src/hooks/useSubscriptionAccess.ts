import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionAccess {
  // Core state
  isSubscriptionEnabled: boolean;
  isSubscriber: boolean;
  loading: boolean;
  
  // Feature access
  hasUnlimitedAccess: boolean;
  canAccessFavorites: boolean;
  canAccessSavedRvws: boolean;
  
  // Rate limiting (for free users when subscription_enabled)
  dailyLimit: number;
  remaining: number;
  resetAt: string | null;
  isRateLimited: boolean;
  
  // Subscription details
  currentPlan: 'monthly' | 'yearly' | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  
  // Actions
  checkAndIncrementUsage: () => Promise<{ allowed: boolean; remaining: number }>;
  refreshRateLimit: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const DAILY_LIMIT = 5;

export function useSubscriptionAccess(): SubscriptionAccess {
  const { user, roles } = useAuth();
  const { isSubscriptionEnabled, loading: settingsLoading } = useAppSettings();
  const { 
    subscription, 
    loading: subscriptionLoading, 
    isSubscribed, 
    currentPlan,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeCustomerId,
    refresh: refreshSubscription,
  } = useSubscription();

  // Check if user is mod or admin (they have unlimited access)
  const isModOrAdmin = roles.includes('admin') || roles.includes('moderator');

  // Memoized rate limit fetcher (called on demand)
  const checkAndIncrementUsage = useCallback(async (): Promise<{ allowed: boolean; remaining: number }> => {
    if (!user?.id) {
      return { allowed: false, remaining: 0 };
    }

    // Mods/Admins always have unlimited access
    if (isModOrAdmin) {
      return { allowed: true, remaining: -1 };
    }

    // Subscribers always allowed
    if (isSubscribed) {
      return { allowed: true, remaining: -1 };
    }

    // If subscriptions are disabled, always allow
    if (!isSubscriptionEnabled) {
      return { allowed: true, remaining: -1 };
    }

    try {
      // Call the database function to increment and check
      const { data, error } = await supabase.rpc('increment_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'copy_rvw',
      });

      if (error) {
        console.error('Error incrementing rate limit:', error);
        // On error, allow the action but log it
        return { allowed: true, remaining: 0 };
      }

      const result = data?.[0];
      if (!result) {
        return { allowed: true, remaining: DAILY_LIMIT - 1 };
      }

      // Check if unlimited (new_count is -1)
      if (result.new_count === -1) {
        return { allowed: true, remaining: -1 };
      }

      return {
        allowed: !result.limit_reached,
        remaining: Math.max(0, DAILY_LIMIT - result.new_count),
      };
    } catch (err) {
      console.error('Error checking rate limit:', err);
      return { allowed: true, remaining: 0 };
    }
  }, [user?.id, isSubscribed, isSubscriptionEnabled, isModOrAdmin]);

  const refreshRateLimit = useCallback(async () => {
    // This will be called to refresh the UI display
    // The actual rate limit is checked in checkAndIncrementUsage
  }, []);

  const access = useMemo<SubscriptionAccess>(() => {
    const loading = settingsLoading || subscriptionLoading;
    
    // Mods/Admins always have full access regardless of subscription settings
    if (isModOrAdmin) {
      return {
        isSubscriptionEnabled,
        isSubscriber: false, // They're not subscribers, they're staff
        loading,
        hasUnlimitedAccess: true,
        canAccessFavorites: true,
        canAccessSavedRvws: true,
        dailyLimit: -1,
        remaining: -1,
        resetAt: null,
        isRateLimited: false,
        currentPlan: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        checkAndIncrementUsage,
        refreshRateLimit,
        refreshSubscription,
      };
    }
    
    // If subscriptions are disabled, everyone has full access
    if (!isSubscriptionEnabled) {
      return {
        isSubscriptionEnabled: false,
        isSubscriber: false,
        loading,
        hasUnlimitedAccess: true,
        canAccessFavorites: true,
        canAccessSavedRvws: true,
        dailyLimit: -1,
        remaining: -1,
        resetAt: null,
        isRateLimited: false,
        currentPlan: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        checkAndIncrementUsage,
        refreshRateLimit,
        refreshSubscription,
      };
    }

    // Subscriptions are enabled
    if (isSubscribed) {
      // Subscriber has unlimited access
      return {
        isSubscriptionEnabled: true,
        isSubscriber: true,
        loading,
        hasUnlimitedAccess: true,
        canAccessFavorites: true,
        canAccessSavedRvws: true,
        dailyLimit: -1,
        remaining: -1,
        resetAt: null,
        isRateLimited: false,
        currentPlan: currentPlan as 'monthly' | 'yearly' | null,
        subscriptionStatus: subscription?.subscriptionStatus || null,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        stripeCustomerId,
        checkAndIncrementUsage,
        refreshRateLimit,
        refreshSubscription,
      };
    }

    // Free user with subscriptions enabled - limited access
    // Note: Actual remaining count is fetched dynamically when needed
    return {
      isSubscriptionEnabled: true,
      isSubscriber: false,
      loading,
      hasUnlimitedAccess: false,
      canAccessFavorites: false,
      canAccessSavedRvws: false,
      dailyLimit: DAILY_LIMIT,
      remaining: DAILY_LIMIT, // Will be updated when checkAndIncrementUsage is called
      resetAt: null,
      isRateLimited: false,
      currentPlan: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      checkAndIncrementUsage,
      refreshRateLimit,
      refreshSubscription,
    };
  }, [
    isSubscriptionEnabled, 
    isSubscribed, 
    currentPlan, 
    subscription, 
    settingsLoading, 
    subscriptionLoading,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeCustomerId,
    isModOrAdmin,
    checkAndIncrementUsage,
    refreshRateLimit,
    refreshSubscription,
  ]);

  return access;
}
