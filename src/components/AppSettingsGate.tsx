import { ReactNode, useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AppSettingsGateProps {
  children: ReactNode;
}

export function AppSettingsGate({ children }: AppSettingsGateProps) {
  const { isAppEnabled, loading } = useAppSettings();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bypassed, setBypassed] = useState(() => {
    // Check session storage on initial render
    return sessionStorage.getItem('maintenance_bypass') === 'true';
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: 'Fout',
        description: 'Voer een wachtwoord in.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      // Use edge function for server-side password verification
      const response = await fetch(
        'https://jsptozrmlibvxzfkvrec.supabase.co/functions/v1/verify-maintenance-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        }
      );

      const result = await response.json();

      if (response.status === 429) {
        toast({
          title: 'Te veel pogingen',
          description: 'Wacht even en probeer het opnieuw.',
          variant: 'destructive',
        });
        return;
      }

      if (result.valid === true) {
        sessionStorage.setItem('maintenance_bypass', 'true');
        setBypassed(true);
        toast({
          title: 'Toegang verleend',
          description: 'U heeft nu toegang tot de applicatie.',
        });
      } else {
        toast({
          title: 'Onjuist wachtwoord',
          description: 'Het ingevoerde wachtwoord is onjuist.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Fout bij verificatie',
        description: err.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Applicatie wordt geladen...</p>
        </div>
      </div>
    );
  }

  // Allow access if app is enabled OR if maintenance bypass is active
  if (isAppEnabled || bypassed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="rounded-lg border p-8 bg-card/80">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-16 w-16 rounded-md bg-destructive flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive-foreground" />
            </div>
            <h1 className="text-2xl font-semibold">Applicatie tijdelijk niet beschikbaar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              De applicatie is momenteel uitgeschakeld of in onderhoud.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="maintenance-password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Toegangswachtwoord
              </label>
              <div className="relative">
                <Input
                  id="maintenance-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer wachtwoord in"
                  className="pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? 'Verifiëren...' : 'Toegang verkrijgen'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Contact: <a className="text-primary underline" href="mailto:rvw@stansmits.nl">rvw@stansmits.nl</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
