import { useState, useEffect } from 'react';
import { fetchAppSettings, getSettingsSync, Settings } from '@/lib/appSettings';

export function useAppSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedSettings = await fetchAppSettings();
        setSettings(fetchedSettings);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        setError(message);
        setSettings(getSettingsSync());
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    settings: settings || getSettingsSync(),
    loading,
    error,
    // Require explicit `true` to consider app enabled. If RPC returns nothing, default to false.
    isAppEnabled: settings?.app_enabled === true,
    isSubscriptionEnabled: settings?.subscription_enabled ?? false,
  };
}
