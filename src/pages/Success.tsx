import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

export default function Success() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading, isSubscribed, currentPlan, currentPeriodEnd, refresh } = useSubscription();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get('session_id');

  const verifySubscription = useCallback(async () => {
    try {
      setError(null);
      await refresh();
      
      // Check if subscription is now active
      // Note: refresh will update the context, so we check isSubscribed after
      return true;
    } catch (err) {
      console.error('Error verifying subscription:', err);
      setError('Er is een fout opgetreden bij het verifiëren van uw abonnement.');
      return false;
    }
  }, [refresh]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const attemptVerification = async () => {
      if (!isMounted) return;

      // Initial delay to allow webhook processing
      if (retryCount === 0 && sessionId) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      await verifySubscription();
      
      if (!isMounted) return;
      setVerifying(false);
    };

    if (sessionId) {
      attemptVerification();
    } else {
      // No session ID - just check current subscription status
      setVerifying(false);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, verifySubscription, retryCount]);

  // Auto-retry if subscription not yet active
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!verifying && !isSubscribed && sessionId && retryCount < MAX_RETRIES) {
      timeoutId = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setVerifying(true);
      }, RETRY_DELAY);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [verifying, isSubscribed, sessionId, retryCount]);

  const handleManualRetry = async () => {
    setVerifying(true);
    setRetryCount(0);
    setError(null);
    await verifySubscription();
    setVerifying(false);
  };

  const handleNavigate = (path: string) => {
    // Ensure subscription is loaded before navigating
    if (!subscriptionLoading) {
      navigate(path);
    }
  };

  // Show auth loading
  if (authLoading) {
    return (
      <Layout showForAnonymous>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Laden...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Layout showForAnonymous>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
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
      </Layout>
    );
  }

  // Verifying subscription
  if (verifying || subscriptionLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Abonnement wordt geverifieerd
              </CardTitle>
              <CardDescription>
                Een moment alstublieft...
                {retryCount > 0 && (
                  <span className="block mt-1 text-xs">
                    Poging {retryCount + 1} van {MAX_RETRIES + 1}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We bevestigen uw betaling en activeren uw abonnement.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Verificatie mislukt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="space-y-2">
                <Button onClick={handleManualRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Opnieuw proberen
                </Button>
                <Button variant="outline" onClick={() => handleNavigate('/')} className="w-full">
                  Ga naar Zoeken
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Subscription still processing (max retries reached but not active)
  if (!isSubscribed && retryCount >= MAX_RETRIES) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
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
                Uw betaling is ontvangen maar de activatie duurt langer dan verwacht. 
                Dit kan enkele minuten duren. U kunt deze pagina vernieuwen of later terugkomen.
              </p>
              <div className="space-y-2">
                <Button onClick={handleManualRetry} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Status vernieuwen
                </Button>
                <Button onClick={() => handleNavigate('/')} className="w-full">
                  Ga naar Zoeken
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Not subscribed (no session_id, just visiting page)
  if (!isSubscribed) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Geen actief abonnement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                U heeft nog geen actief abonnement. Bekijk onze prijzen om een abonnement af te sluiten.
              </p>
              <div className="space-y-2">
                <Button onClick={() => handleNavigate('/pricing')} className="w-full">
                  Bekijk prijzen
                </Button>
                <Button variant="outline" onClick={() => handleNavigate('/')} className="w-full">
                  Ga naar Zoeken
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Success - subscription is active
  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
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
            <Alert className="border-green-200 bg-green-100 dark:bg-green-900/50 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                Hartelijk dank voor uw abonnement! Uw betaling is ontvangen en verwerkt.
              </AlertDescription>
            </Alert>

            {/* Subscription Details */}
            <div className="space-y-3 bg-background/80 p-4 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold capitalize">
                  {currentPlan === 'monthly' ? 'Maandelijks' : currentPlan === 'yearly' ? 'Jaarlijks' : 'Premium'}
                </span>
              </div>
              {currentPeriodEnd && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Volgende verlenging</span>
                  <span className="font-semibold">
                    {new Date(currentPeriodEnd).toLocaleDateString('nl-NL', {
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
              <Button onClick={() => handleNavigate('/')} className="w-full">
                Ga naar Zoeken
              </Button>
              <Button variant="outline" onClick={() => handleNavigate('/settings')} className="w-full">
                Abonnement beheren
              </Button>
            </div>

            {/* Support */}
            <p className="text-xs text-center text-muted-foreground">
              Vragen? <a href="/settings" className="underline hover:text-foreground">Neem contact op</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
