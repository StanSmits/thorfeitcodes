import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Bell } from 'lucide-react';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { computePasswordStrength } from '@/lib/utils';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  

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

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground mt-2">
          Beheer uw account en voorkeuren
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profiel
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
