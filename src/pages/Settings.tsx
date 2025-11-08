import { useState } from 'react';
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

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Volledige naam</Label>
                <Input
                  value={user?.user_metadata?.full_name || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Naam kan momenteel niet worden gewijzigd
                </p>
              </div>
              <div className="space-y-2">
                <Label>E-mailadres</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  E-mailadres kan momenteel niet worden gewijzigd
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input
                  value={user?.id || ''}
                  disabled
                  className="bg-muted font-mono text-xs"
                />
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
                  <Label htmlFor="current-password">Huidig wachtwoord</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Niet vereist voor wachtwoordwijziging
                  </p>
                </div>
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
                <Button type="submit" disabled={loading}>
                  {loading ? 'Bezig met wijzigen...' : 'Wachtwoord wijzigen'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account beveiliging</CardTitle>
              <CardDescription>
                Aanvullende beveiligingsopties voor uw account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Twee-factor authenticatie</p>
                  <p className="text-sm text-muted-foreground">
                    Extra beveiliging voor uw account
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Binnenkort
                </Button>
              </div>
              <Separator />
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
          </Card>
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
    </div>
  );
}
