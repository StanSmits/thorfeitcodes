import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Trash2, Shield } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

export function MaintenancePasswordSettings() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if password is set on mount
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('is_maintenance_password_set');
        if (error) throw error;
        setIsPasswordSet(data === true);
      } catch (err) {
        console.error('Failed to check maintenance password status:', err);
        setIsPasswordSet(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkPasswordStatus();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Fout',
        description: 'De wachtwoorden komen niet overeen.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Fout',
        description: 'Het wachtwoord moet minimaal 6 karakters bevatten.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_maintenance_password', {
        p_password: password,
      });

      if (error) throw error;

      toast({
        title: 'Onderhoudswachtwoord ingesteld',
        description: 'Het wachtwoord is succesvol ingesteld en kan nu worden gebruikt om toegang te krijgen wanneer de app is uitgeschakeld.',
      });

      setPassword('');
      setConfirmPassword('');
      setIsPasswordSet(true);
    } catch (error: any) {
      toast({
        title: 'Fout bij instellen wachtwoord',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearPassword = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('clear_maintenance_password');

      if (error) throw error;

      toast({
        title: 'Onderhoudswachtwoord verwijderd',
        description: 'Het wachtwoord is verwijderd. Toegang tijdens onderhoud is niet meer mogelijk.',
      });

      setIsPasswordSet(false);
    } catch (error: any) {
      toast({
        title: 'Fout bij verwijderen wachtwoord',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Onderhoudswachtwoord
        </CardTitle>
        <CardDescription>
          Stel een wachtwoord in waarmee toegang tot de app mogelijk is wanneer deze is uitgeschakeld voor onderhoud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPasswordSet && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Er is een onderhoudswachtwoord ingesteld. Gebruikers kunnen dit wachtwoord gebruiken om toegang te krijgen wanneer de app is uitgeschakeld.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maintenance-password">
              {isPasswordSet ? 'Nieuw wachtwoord' : 'Wachtwoord'}
            </Label>
            <Input
              id="maintenance-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Voer wachtwoord in"
              autoComplete="new-password"
            />
            {password && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-maintenance-password">Bevestig wachtwoord</Label>
            <Input
              id="confirm-maintenance-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Bevestig wachtwoord"
              autoComplete="new-password"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !password || !confirmPassword}>
              {loading ? 'Bezig...' : isPasswordSet ? 'Wachtwoord wijzigen' : 'Wachtwoord instellen'}
            </Button>

            {isPasswordSet && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleClearPassword}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
