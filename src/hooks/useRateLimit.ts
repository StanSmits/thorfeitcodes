import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitStatus {
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  resetAt: string | null;
  loading: boolean;
}

const DAILY_LIMIT = 5;

export function useRateLimit() {
  const { user } = useAuth();
  const [status, setStatus] = useState<RateLimitStatus>({
    currentCount: 0,
    dailyLimit: DAILY_LIMIT,
    remaining: DAILY_LIMIT,
    resetAt: null,
    loading: true,
  });

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_rate_limit_status', {
        p_user_id: user.id,
        p_action_type: 'copy_rvw',
      });

      if (error) {
        console.error('Error fetching rate limit status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const result = data?.[0];
      if (result) {
        setStatus({
          currentCount: result.current_count,
          dailyLimit: result.daily_limit,
          remaining: result.remaining,
          resetAt: result.reset_at,
          loading: false,
        });
      } else {
        setStatus({
          currentCount: 0,
          dailyLimit: DAILY_LIMIT,
          remaining: DAILY_LIMIT,
          resetAt: null,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Error fetching rate limit:', err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refresh = useCallback(() => {
    return fetchStatus();
  }, [fetchStatus]);

  // Check if user has unlimited access (mods/admins get dailyLimit of -1)
  const isUnlimited = status.dailyLimit === -1;

  return {
    ...status,
    refresh,
    isLimited: !isUnlimited && status.remaining <= 0,
    isUnlimited,
    usagePercentage: isUnlimited 
      ? 0 
      : status.dailyLimit > 0 
        ? (status.currentCount / status.dailyLimit) * 100 
        : 0,
  };
}
