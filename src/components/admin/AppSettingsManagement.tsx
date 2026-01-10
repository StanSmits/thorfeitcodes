import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Power, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { invalidateSettingsCache } from '@/lib/appSettings';

interface AppSetting {
  key: string;
  value: boolean;
  updated_at: string | null;
}

export function AppSettingsManagement() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
      toast({
        title: 'Fout',
        description: 'Kon instellingen niet laden.',
        variant: 'destructive',
      });
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

      toast({
        title: 'Instelling bijgewerkt',
        description: `${getSettingLabel(key)} is ${newValue ? 'ingeschakeld' : 'uitgeschakeld'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Fout bij bijwerken',
        description: err.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
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
          .filter(s => s.key !== 'maintenance_password_enabled') // Hide this one, managed in password settings
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
      </CardContent>
    </Card>
  );
}
