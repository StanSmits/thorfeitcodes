import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Clock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomerPortalButton } from '@/components/CustomerPortalButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export function SubscriptionSettings() {
  const { 
    subscription, 
    isSubscribed, 
    currentPlan, 
    currentPeriodEnd,
    cancelAtPeriodEnd,
    subscriptionStatus,
    loading 
  } = useSubscription();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Abonnement</h3>
          <p className="text-sm text-muted-foreground">
            Beheer uw abonnement en facturering
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Abonnement</h3>
        <p className="text-sm text-muted-foreground">
          Beheer uw abonnement en facturering
        </p>
      </div>

      {!isSubscribed ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            U bent momenteel niet geabonneerd.{' '}
            <Link to="/pricing" className="underline font-semibold">
              Bekijk onze plannen
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Huidig abonnement</span>
                <Badge
                  variant={subscriptionStatus === 'active' ? 'default' : 'secondary'}
                >
                  {subscriptionStatus === 'active' ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Actief
                    </>
                  ) : subscriptionStatus === 'past_due' ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Betaling vereist
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      {subscriptionStatus}
                    </>
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">
                    {currentPlan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
                  </p>
                </div>

                {/* Next Renewal */}
                {currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {cancelAtPeriodEnd ? 'Eindigt op' : 'Volgende verlenging'}
                    </p>
                    <p className="font-semibold">
                      {new Date(currentPeriodEnd).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {cancelAtPeriodEnd && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Uw abonnement wordt niet verlengd. U heeft toegang tot{' '}
                    {currentPeriodEnd && new Date(currentPeriodEnd).toLocaleDateString('nl-NL')}.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Subscription Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Abonnement beheren</CardTitle>
              <CardDescription>
                Update uw betaalmethode of annuleer uw abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CustomerPortalButton className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                U wordt doorgestuurd naar het Stripe klantenportaal
              </p>
            </CardContent>
          </Card>

          {/* Payment Method Alert */}
          {subscriptionStatus === 'past_due' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Uw betaling is mislukt. Werk uw betaalmethode bij om uw abonnement te herstellen.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
