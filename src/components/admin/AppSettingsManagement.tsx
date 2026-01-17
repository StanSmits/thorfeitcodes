import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { toastSuccess, toastError, toastSettingsUpdated } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Power, CreditCard, AlertTriangle, RefreshCw, Megaphone, HelpCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { invalidateSettingsCache } from '@/lib/appSettings';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Configure DOMPurify to only allow safe HTML tags
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'strong', 'b', 'em', 'i', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
};

interface AppSetting {
  key: string;
  value: boolean;
  updated_at: string | null;
}

export function AppSettingsManagement() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bannerText, setBannerText] = useState('');
  const [bannerColor, setBannerColor] = useState('#3b82f6');
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_app_settings');
      
      if (error) throw error;
      
      // Ensure we have default values for expected settings
      const settingsMap = new Map<string, AppSetting>();
      (data as AppSetting[] || []).forEach(s => settingsMap.set(s.key, s));
      
      // Add defaults if missing
      if (!settingsMap.has('app_enabled')) {
        settingsMap.set('app_enabled', { key: 'app_enabled', value: false, updated_at: null });
      }
      if (!settingsMap.has('subscription_enabled')) {
        settingsMap.set('subscription_enabled', { key: 'subscription_enabled', value: false, updated_at: null });
      }
      
      setSettings(Array.from(settingsMap.values()));
      
      // Fetch banner text
      const { data: bannerData } = await supabase
        .from('settings_text')
        .select('value')
        .eq('key', 'pricing_banner_text')
        .single();
      
      if (bannerData) {
        setBannerText(bannerData.value || '');
      }

      // Fetch banner enabled state
      const { data: bannerEnabledData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'promotion_banner_enabled')
        .single();
      
      if (bannerEnabledData) {
        setBannerEnabled(bannerEnabledData.value === true);
      }

      // Fetch banner color
      const { data: bannerColorData } = await supabase
        .from('settings_text')
        .select('value')
        .eq('key', 'promotion_banner_color')
        .single();
      
      if (bannerColorData && bannerColorData.value) {
        setBannerColor(bannerColorData.value);
      }
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
      toastError('Fout', 'Kon instellingen niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (key: string, newValue: boolean) => {
    setUpdating(key);
    try {
      const { error } = await supabase.rpc('update_app_setting', {
        p_key: key,
        p_value: newValue,
      });

      if (error) throw error;

      // Update local state
      setSettings(prev => 
        prev.map(s => s.key === key ? { ...s, value: newValue, updated_at: new Date().toISOString() } : s)
      );

      // Invalidate the settings cache so changes take effect immediately
      invalidateSettingsCache();

      toastSettingsUpdated();
    } catch (err: any) {
      toastError('Fout', err.message || 'Kon instelling niet bijwerken.');
    } finally {
    setUpdating(null);
    }
  };

  const handleBannerSave = async () => {
    setBannerLoading(true);
    try {
      const { error } = await supabase
        .from('settings_text')
        .upsert({ key: 'pricing_banner_text', value: bannerText.trim() }, { onConflict: 'key' });

      if (error) throw error;

      toastSuccess('Banner opgeslagen');
    } catch (err: any) {
      toastError('Fout', err.message || 'Kon banner niet opslaan.');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleBannerToggle = async (enabled: boolean) => {
    setUpdating('promotion_banner_enabled');
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'promotion_banner_enabled', value: enabled }, { onConflict: 'key' });

      if (error) throw error;

      setBannerEnabled(enabled);

      toastSuccess(enabled ? 'Banner ingeschakeld' : 'Banner uitgeschakeld');
    } catch (err: any) {
      toastError('Fout', err.message || 'Kon banner niet wijzigen.');
    } finally {
      setUpdating(null);
    }
  };

  const getSettingLabel = (key: string): string => {
    switch (key) {
      case 'app_enabled':
        return 'Applicatie actief';
      case 'subscription_enabled':
        return 'Abonnementen actief';
      case 'maintenance_password_enabled':
        return 'Onderhoudswachtwoord';
      default:
        return key;
    }
  };

  const getSettingDescription = (key: string): string => {
    switch (key) {
      case 'app_enabled':
        return 'Wanneer uitgeschakeld, is de applicatie niet toegankelijk voor gebruikers (behalve met onderhoudswachtwoord).';
      case 'subscription_enabled':
        return 'Schakelt de abonnementenfunctionaliteit in of uit in de hele applicatie.';
      case 'maintenance_password_enabled':
        return 'Of het onderhoudswachtwoord actief is voor toegang tijdens onderhoud.';
      default:
        return '';
    }
  };

  const getSettingIcon = (key: string) => {
    switch (key) {
      case 'app_enabled':
        return <Power className="h-5 w-5" />;
      case 'subscription_enabled':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const appEnabled = settings.find(s => s.key === 'app_enabled')?.value ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              App Instellingen
            </CardTitle>
            <CardDescription>
              Beheer de globale applicatie-instellingen
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!appEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              De applicatie is momenteel uitgeschakeld. Gebruikers hebben geen toegang tot de app.
            </AlertDescription>
          </Alert>
        )}

        {settings
          .filter(s => s.key !== 'maintenance_password_enabled' && s.key !== 'promotion_banner_enabled') // Hide these, managed elsewhere
          .map(setting => (
            <div
              key={setting.key}
              className="flex items-center justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-md ${setting.value ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {getSettingIcon(setting.key)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={setting.key} className="font-medium">
                      {getSettingLabel(setting.key)}
                    </Label>
                    <Badge variant={setting.value ? 'default' : 'secondary'} className={setting.value ? 'bg-green-500' : ''}>
                      {setting.value ? 'Actief' : 'Inactief'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription(setting.key)}
                  </p>
                  {setting.updated_at && (
                    <p className="text-xs text-muted-foreground">
                      Laatst gewijzigd: {formatDistanceToNow(new Date(setting.updated_at), { addSuffix: true, locale: nl })}
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={setting.value}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
                disabled={updating === setting.key}
              />
            </div>
          ))}

        {/* Banner Text Setting */}
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-md ${bannerEnabled ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="banner-toggle" className="font-medium">
                    Promotiebanner
                  </Label>
                  <Badge variant={bannerEnabled ? 'default' : 'secondary'} className={bannerEnabled ? 'bg-green-500' : ''}>
                    {bannerEnabled ? 'Actief' : 'Inactief'}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Promotiebanner Handleiding</DialogTitle>
                        <DialogDescription>
                          De promotiebanner wordt app-breed getoond (behalve op de inlogpagina).
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">HTML Ondersteuning</h4>
                          <p className="text-muted-foreground mb-2">
                            Je kunt HTML gebruiken voor opmaak en links. Bijvoorbeeld:
                          </p>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-2">
                            <p>🎉 Korting! Gebruik code <strong>&lt;strong&gt;WELKOM&lt;/strong&gt;</strong></p>
                            <p>Bekijk onze &lt;a href="/pricing"&gt;abonnementen&lt;/a&gt;</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Ondersteunde HTML tags</h4>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li><code className="bg-muted px-1 rounded">&lt;a href="..."&gt;</code> - Links</li>
                            <li><code className="bg-muted px-1 rounded">&lt;strong&gt;</code> of <code className="bg-muted px-1 rounded">&lt;b&gt;</code> - Vetgedrukt</li>
                            <li><code className="bg-muted px-1 rounded">&lt;em&gt;</code> of <code className="bg-muted px-1 rounded">&lt;i&gt;</code> - Cursief</li>
                            <li><code className="bg-muted px-1 rounded">&lt;br&gt;</code> - Regelafbreking</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Voorbeeld</h4>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs">
                            🚀 Nieuw! Bekijk onze &lt;a href="/kennisbank"&gt;kennisbank&lt;/a&gt; voor meer informatie.
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground text-xs">
                            💡 Tip: Emoji's worden ook ondersteund! Gebruik ze om aandacht te trekken.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground">
                  Toon een promotiebanner in de hele applicatie. Ondersteunt HTML voor links en opmaak.
                </p>
              </div>
            </div>
            <Switch
              id="banner-toggle"
              checked={bannerEnabled}
              onCheckedChange={handleBannerToggle}
              disabled={updating === 'promotion_banner_enabled'}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="banner-text" className="text-sm text-muted-foreground">
              Banner tekst (HTML toegestaan)
            </Label>
            <Textarea
              id="banner-text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Bijv: 🎉 Eerste maand gratis! <a href='/pricing'>Bekijk aanbieding</a>"
              className="min-h-[80px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Laat leeg om de banner te verbergen (ook als ingeschakeld).
              </p>
              <Button 
                onClick={handleBannerSave} 
                disabled={bannerLoading}
                variant="outline"
                size="sm"
              >
                {bannerLoading ? 'Opslaan...' : 'Tekst opslaan'}
              </Button>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Achtergrondkleur
            </Label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
              />
              <input
                type="text"
                value={bannerColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#([A-Fa-f0-9]{0,6})$/.test(val)) {
                    setBannerColor(val);
                  }
                }}
                placeholder="#3b82f6"
                className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('settings_text')
                      .upsert({ key: 'promotion_banner_color', value: bannerColor }, { onConflict: 'key' });
                    if (error) throw error;
                    toastSuccess('Kleur opgeslagen');
                  } catch (err: any) {
                    toastError('Fout', err.message || 'Kon kleur niet opslaan.');
                  }
                }}
                variant="outline"
                size="sm"
              >
                Kleur opslaan
              </Button>
              <Button
                onClick={() => setBannerColor('#3b82f6')}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Kies een kleur voor de banner achtergrond. Standaard: blauw (#3b82f6)
            </p>
          </div>

          {bannerText.trim() && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Voorbeeld:</Label>
              <div 
                className="relative px-4 py-3 rounded-lg text-white"
                style={{ backgroundColor: bannerColor }}
              >
                <div 
                  className="text-center text-sm font-medium [&_a]:underline [&_a]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(bannerText) }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="font-medium">
                Beveiliging
              </Label>
              <p className="text-sm text-muted-foreground">
                Verwijder verouderde backup codes uit gebruikersmetadata (legacy data die niet meer wordt gebruikt).
              </p>
            </div>
          </div>
          <Button
            onClick={async () => {
              setSanitizing(true);
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                
                if (!accessToken) {
                  throw new Error('Niet ingelogd');
                }

                const response = await fetch(
                  'https://jsptozrmlibvxzfkvrec.supabase.co/functions/v1/sanitize-user-metadata',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`,
                    },
                  }
                );

                const result = await response.json();
                
                if (!response.ok) {
                  throw new Error(result.error || 'Er is een fout opgetreden');
                }

                toastSuccess('Data opgeschoond', `${result.sanitizedCount} gebruiker(s) bijgewerkt.`);
              } catch (err: any) {
                toastError('Fout', err.message || 'Kon data niet opschonen.');
              } finally {
                setSanitizing(false);
              }
            }}
            disabled={sanitizing}
            variant="outline"
            size="sm"
          >
            {sanitizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              'Gebruikersdata opschonen'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
