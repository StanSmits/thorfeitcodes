import { ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AppSettingsGateProps {
  children: ReactNode;
}

export function AppSettingsGate({ children }: AppSettingsGateProps) {
  const { isAppEnabled, isSubscriptionEnabled, settings, loading, error } = useAppSettings();

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

  if (!isAppEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-4xl">
          <div className="rounded-lg border p-8 bg-card/80">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-md bg-destructive flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Applicatie tijdelijk niet beschikbaar</h1>
                <p className="mt-2 text-sm text-muted-foreground">De applicatie is momenteel uitgeschakeld of in onderhoud.</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p>Als u beheerder bent, controleer alstublieft de app-instellingen.</p>
                  <p>Contact: <a className="text-primary underline" href="mailto:rvw.stansmits.nl">rvw@stansmits.nl</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
