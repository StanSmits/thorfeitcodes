import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Success() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Wait a moment for the webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        setVerifying(false);
      } catch (error) {
        console.error('Error verifying session:', error);
        setVerifying(false);
      }
    };

    if (sessionId) {
      verifySession();
    }
  }, [sessionId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Fout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              U moet ingelogd zijn om uw abonnement te bevestigen.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifying || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Abonnement wordt geverifieerd
            </CardTitle>
            <CardDescription>
              Een moment alstublieft...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We bevestigen uw betaling en activeren uw abonnement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Abonnement in behandeling
            </CardTitle>
            <CardDescription>
              Uw abonnement wordt verwerkt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uw betaling is ontvangen. Uw abonnement wordt in de komende seconden geactiveerd. Als u hier over enkele minuten nog bent, kunt u naar uw dashboard gaan.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ga naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
      <Card className="w-full max-w-md border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            Abonnement geactiveerd
          </CardTitle>
          <CardDescription>
            Welkom bij ons premium aanbod
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Message */}
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <AlertDescription className="text-green-800 dark:text-green-200">
              Hartelijk dank voor uw abonnement! Uw betaling is ontvangen en verwerkt.
            </AlertDescription>
          </Alert>

          {/* Subscription Details */}
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold capitalize">
                {subscription.current_plan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
              </span>
            </div>
            {subscription.next_renewal_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volgende verlenging</span>
                <span className="font-semibold">
                  {new Date(subscription.next_renewal_date).toLocaleDateString('nl-NL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-green-600 dark:text-green-400">Actief</span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Wat nu?</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>U heeft nu toegang tot alle premium functies</li>
              <li>Uw abonnement verlengt automatisch</li>
              <li>U kunt uw abonnement op elk moment beheren</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ga naar Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')} className="w-full">
              Abonnement beheren
            </Button>
          </div>

          {/* Support */}
          <p className="text-xs text-center text-muted-foreground">
            Vragen? <a href="/support" className="underline hover:text-foreground">Neem contact op</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
