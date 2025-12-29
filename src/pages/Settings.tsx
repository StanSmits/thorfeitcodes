import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Bell, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { computePasswordStrength } from '@/lib/utils';
import { ColorPicker } from '@/components/ColorPicker';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCustomTheme, setShowCustomTheme] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: '#4c63d2',
    secondary: '#f0f0f0',
    accent: '#ff4d7d',
    background: '#fafafa',
    foreground: '#1a1a1a',
  });

  useEffect(() => {
    // Load custom colors from localStorage and apply if custom theme is active
    const savedColors = localStorage.getItem('customThemeColors');
    if (savedColors) {
      try {
        const colors = JSON.parse(savedColors);
        setCustomColors(colors);
        
        // If custom theme is currently selected, reapply the styles
        if (theme === 'custom') {
          applyCustomThemeStyles(colors);
        }
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nameChanged = fullName !== user?.user_metadata?.full_name;

      if (!nameChanged) {
        toast({ title: 'Geen wijzigingen', description: 'Er zijn geen wijzigingen om op te slaan.' });
        setLoading(false);
        return;
      }

      if (!user?.id) throw new Error('Geen ingelogde gebruiker gevonden');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Profiel bijgewerkt', description: 'Uw profiel is succesvol bijgewerkt.' });
      setIsEditingProfile(false);
      // refresh client-side user/profile
      await refreshUser().catch(() => {});
    } catch (error: any) {
      toast({
        title: 'Fout bij bijwerken profiel',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Fout',
        description: 'De nieuwe wachtwoorden komen niet overeen.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Fout',
        description: 'Het wachtwoord moet minimaal 6 karakters bevatten.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Wachtwoord bijgewerkt',
        description: 'Uw wachtwoord is succesvol gewijzigd.',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Fout bij wijzigen wachtwoord',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // use shared computePasswordStrength from utils

  const hexToHsl = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const applyCustomThemeStyles = (colors: typeof customColors) => {
    const styleId = 'custom-theme-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const primary = hexToHsl(colors.primary);
    const secondary = hexToHsl(colors.secondary);
    const accent = hexToHsl(colors.accent);
    const background = hexToHsl(colors.background);
    const foreground = hexToHsl(colors.foreground);

    // Generate CSS for custom theme
    styleElement.textContent = `
      :root.custom {
        --primary: ${primary};
        --secondary: ${secondary};
        --accent: ${accent};
        --background: ${background};
        --foreground: ${foreground};
        
        --card: 0 0% 100%;
        --card-foreground: ${foreground};
        
        --popover: 0 0% 100%;
        --popover-foreground: ${foreground};
        
        --primary-foreground: 0 0% 100%;
        --secondary-foreground: 0 0% 100%;
        --accent-foreground: 0 0% 100%;
        --destructive-foreground: 0 0% 100%;
        
        --muted: 0 0% 90%;
        --muted-foreground: 0 0% 50%;
        
        --destructive: 0 84% 60%;
        
        --border: 0 0% 90%;
        --input: 0 0% 90%;
        --ring: ${primary};
        
        --favorite: 45 93% 47%;
        --favorite-foreground: 45 93% 47%;
        
        --sidebar-background: 0 0% 15%;
        --sidebar-foreground: 0 0% 98%;
        --sidebar-primary: ${primary};
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: ${secondary};
        --sidebar-accent-foreground: 0 0% 98%;
        --sidebar-border: 0 0% 25%;
        --sidebar-ring: ${primary};
      }
    `;
  };

  const applyCustomTheme = () => {
    // Save to localStorage
    localStorage.setItem('customThemeColors', JSON.stringify(customColors));

    // Apply the theme styles
    applyCustomThemeStyles(customColors);

    toast({
      title: 'Aangepast thema toegepast',
      description: 'De kleuren zijn bijgewerkt.',
    });
  };

  const updateCustomColor = (key: keyof typeof customColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // use shared computePasswordStrength from utils

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground mt-2">
          Beheer uw account en voorkeuren
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profiel
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Uiterlijk
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Beveiliging
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificaties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profielinformatie</CardTitle>
              <CardDescription>
                Uw persoonlijke gegevens en accountinformatie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Volledige naam</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setIsEditingProfile(true);
                    }}
                    placeholder="Jan Jansen"
                  />
                </div>
                {/* Email changes disabled in this UI — only name can be changed */}
                {isEditingProfile && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFullName(user?.user_metadata?.full_name || '');
                        setIsEditingProfile(false);
                      }}
                      disabled={loading}
                    >
                      Annuleren
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Opslaan...' : 'Wijzigingen opslaan'}
                    </Button>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label>Account ID</Label>
                  <Input
                    value={user?.id || ''}
                    disabled
                    className="bg-muted font-mono text-xs"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thema</CardTitle>
              <CardDescription>
                Kies het thema voor de applicatie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={theme} onValueChange={setTheme}>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center cursor-pointer">
                    <span className="ml-2">Licht modus</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center cursor-pointer">
                    <span className="ml-2">Donker modus</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="amsterdam" id="amsterdam" />
                  <Label htmlFor="amsterdam" className="flex items-center cursor-pointer">
                    <span className="ml-2">Amsterdam thema</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex items-center cursor-pointer">
                    <span className="ml-2">Aangepast thema</span>
                  </Label>
                </div>
              </RadioGroup>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Licht modus:</strong> Professioneel blauw/navy kleurenschema voor gebruik overdag
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Donker modus:</strong> Donker thema dat gemakkelijker is voor de ogen in donkere omgevingen
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Amsterdam thema:</strong> Kleurenschema gebaseerd op het logo van Amsterdam met rood en blauw
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Aangepast thema:</strong> Een uniek paars kleurenschema voor persoonlijke voorkeur
                </p>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomTheme(!showCustomTheme)}
                  className="w-full flex items-center justify-between"
                >
                  <span>Aangepaste kleurinstellingen</span>
                  {showCustomTheme ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {showCustomTheme && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Pas de kleuren aan voor het aangepaste thema. Deze kleuren worden toegepast wanneer je het "Aangepast thema" selecteert.
                    </p>
                    <ColorPicker
                      label="Primaire kleur"
                      value={customColors.primary}
                      onChange={(value) => updateCustomColor('primary', value)}
                      description="Gebruikt voor knoppen en highlights"
                    />
                    <ColorPicker
                      label="Secundaire kleur"
                      value={customColors.secondary}
                      onChange={(value) => updateCustomColor('secondary', value)}
                      description="Gebruikt voor accenten"
                    />
                    <ColorPicker
                      label="Accentkleur"
                      value={customColors.accent}
                      onChange={(value) => updateCustomColor('accent', value)}
                      description="Gebruikt voor interactieve elementen"
                    />
                    <ColorPicker
                      label="Achtergrondkleur"
                      value={customColors.background}
                      onChange={(value) => updateCustomColor('background', value)}
                      description="Algemene achtergrond"
                    />
                    <ColorPicker
                      label="Tekstkleur"
                      value={customColors.foreground}
                      onChange={(value) => updateCustomColor('foreground', value)}
                      description="Primaire tekstkleur"
                    />
                    <Button
                      onClick={applyCustomTheme}
                      className="w-full"
                    >
                      Aangepaste kleuren toepassen
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wachtwoord wijzigen</CardTitle>
              <CardDescription>
                Wijzig uw wachtwoord om uw account te beveiligen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nieuw wachtwoord</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <PasswordStrengthIndicator password={newPassword} />
                  {newPassword && (
                    <p className={`text-xs mt-1 ${computePasswordStrength(newPassword) < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {computePasswordStrength(newPassword) < 60 ? 'Wachtwoord te zwak (minimaal 3 van 5 checks vereist).' : 'Wachtwoordsterkte voldoende.'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Bevestig nieuw wachtwoord</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading || computePasswordStrength(newPassword) < 60}>
                  {loading ? 'Bezig met wijzigen...' : 'Wachtwoord wijzigen'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <TwoFactorSetup />

          {/* <Card>
            <CardHeader>
              <CardTitle>Account beveiliging</CardTitle>
              <CardDescription>
                Aanvullende beveiligingsopties voor uw account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Actieve sessies</p>
                  <p className="text-sm text-muted-foreground">
                    Beheer apparaten waar u bent ingelogd
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Binnenkort
                </Button>
              </div>
            </CardContent>
          </Card> */}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificatie voorkeuren</CardTitle>
              <CardDescription>
                Bepaal hoe en wanneer u notificaties ontvangt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-mail notificaties</p>
                  <p className="text-sm text-muted-foreground">
                    Ontvang updates via e-mail
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Binnenkort
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Systeem notificaties</p>
                  <p className="text-sm text-muted-foreground">
                    Belangrijke updates over uw account
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Binnenkort
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email change flow removed — only name editing is supported */}
    </div>
  );
}
