import { supabase } from '@/integrations/supabase/client';

const RATE_LIMIT_KEY = 'rate_limit:';
const FACT_CODES_PER_DAY = 5;

interface RateLimitData {
  count: number;
  resetAt: number;
}

function getRateLimitKey(userId: string, feature: string): string {
  return `${RATE_LIMIT_KEY}${userId}:${feature}`;
}

function getStoredRateLimit(key: string): RateLimitData | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored) as RateLimitData;
    const now = Date.now();
    
    if (data.resetAt < now) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

function setRateLimit(key: string, count: number, resetAt: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ count, resetAt }));
  } catch {
    console.warn('Failed to set rate limit in localStorage');
  }
}

export async function checkFactCodeRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const key = getRateLimitKey(userId, 'fact_codes');
  const now = Date.now();
  let data = getStoredRateLimit(key);

  if (!data) {
    const resetAt = now + 24 * 60 * 60 * 1000;
    setRateLimit(key, 0, resetAt);
    data = { count: 0, resetAt };
  }

  const remaining = Math.max(0, FACT_CODES_PER_DAY - data.count);
  const allowed = remaining > 0;

  if (allowed) {
    const newCount = data.count + 1;
    setRateLimit(key, newCount, data.resetAt);
  }

  return {
    allowed,
    remaining: Math.max(0, remaining - 1),
    resetAt: data.resetAt,
  };
}

export function getRateLimitStatus(userId: string): {
  remaining: number;
  resetAt: number;
  isLimited: boolean;
} {
  const key = getRateLimitKey(userId, 'fact_codes');
  const data = getStoredRateLimit(key);

  if (!data) {
    const now = Date.now();
    return {
      remaining: FACT_CODES_PER_DAY,
      resetAt: now + 24 * 60 * 60 * 1000,
      isLimited: false,
    };
  }

  const remaining = Math.max(0, FACT_CODES_PER_DAY - data.count);

  return {
    remaining,
    resetAt: data.resetAt,
    isLimited: remaining === 0,
  };
}

export function clearRateLimitCache(userId: string): void {
  const key = getRateLimitKey(userId, 'fact_codes');
  localStorage.removeItem(key);
}
