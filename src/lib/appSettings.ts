import { supabase } from '@/integrations/supabase/client';

export interface Settings {
  app_enabled: boolean;
  subscription_enabled: boolean;
  [key: string]: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  // Require explicit true for the app to be enabled. If settings are missing, app remains closed.
  app_enabled: false,
  subscription_enabled: false,
};

let settingsCache: Settings | null = null;
let fetchPromise: Promise<Settings> | null = null;

export async function fetchAppSettings(): Promise<Settings> {
  if (settingsCache) {
    return settingsCache;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_app_settings');

      if (error) {
        console.error('Error fetching app settings:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        return DEFAULT_SETTINGS;
      }

      // Normalize values returned from RPC which may be strings ('true'/'false')
      const normalized: Record<string, boolean> = {};
      for (const key of Object.keys(data)) {
        const val = (data as Record<string, unknown>)[key];
        if (typeof val === 'boolean') {
          normalized[key] = val;
        } else if (typeof val === 'string') {
          normalized[key] = val.toLowerCase() === 'true';
        } else if (typeof val === 'number') {
          normalized[key] = val !== 0;
        } else {
          normalized[key] = Boolean(val);
        }
      }

      settingsCache = {
        ...DEFAULT_SETTINGS,
        ...normalized,
      };

      return settingsCache;
    } catch (err) {
      console.error('Error fetching app settings:', err);
      return DEFAULT_SETTINGS;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getSettingsSync(): Settings {
  return settingsCache || DEFAULT_SETTINGS;
}

export function isAppEnabled(): boolean {
  const settings = getSettingsSync();
  // Only treat app as enabled when explicitly set to true
  return settings.app_enabled === true;
}

export function isSubscriptionEnabled(): boolean {
  const settings = getSettingsSync();
  return settings.subscription_enabled === true;
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
}
