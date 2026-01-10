import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

interface BannerSettings {
  text: string | null;
  enabled: boolean;
  color: string;
}

export function PromotionBanner() {
  const [settings, setSettings] = useState<BannerSettings>({ text: null, enabled: false, color: '#3b82f6' });
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  useEffect(() => {
    const fetchBannerSettings = async () => {
      // Fetch banner text, enabled status, and color
      const [textResult, enabledResult, colorResult] = await Promise.all([
        supabase
          .from('settings_text')
          .select('value')
          .eq('key', 'pricing_banner_text')
          .single(),
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'promotion_banner_enabled')
          .single(),
        supabase
          .from('settings_text')
          .select('value')
          .eq('key', 'promotion_banner_color')
          .single(),
      ]);

      const text = textResult.data?.value?.trim() || null;
      const enabled = enabledResult.data?.value === true;
      const color = colorResult.data?.value || '#3b82f6';

      setSettings({ text, enabled, color });
    };

    fetchBannerSettings();
  }, []);

  // Only show if enabled, has text, and not dismissed
  if (!settings.enabled || !settings.text || dismissed) {
    return null;
  }

  return (
    <div 
      className="relative px-4 py-3 rounded-lg text-white"
      style={{ backgroundColor: settings.color }}
    >
      <div 
        className="pr-8 text-center text-sm font-medium [&_a]:underline [&_a]:font-semibold [&_a]:hover:opacity-80"
        dangerouslySetInnerHTML={{ __html: settings.text }}
      />
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
        aria-label="Sluiten"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
