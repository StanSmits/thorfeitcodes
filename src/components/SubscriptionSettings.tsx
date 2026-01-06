import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SubscriptionSettings() {
  const { subscription, isSubscribed, currentPlan, loading } = useSubscription();

  const handleManageSubscription = () => {
    // This would typically redirect to Stripe's customer portal
    const portalUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-customer-portal`;
    window.location.href = portalUrl;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-lg animate-pulse"></div>
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
            U bent momenteel niet geabonneerd. <a href="/pricing" className="underline font-semibold">Bekijk onze plannen</a>
          </AlertDescription>
        </Alert>
      ) : subscription ? (
        <>
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Huidigeabonnement</span>
                <Badge
                  variant={
                    subscription.subscription_status === 'active' ? 'default' : 'secondary'
                  }
              >
                  {subscription.subscription_status === 'active' ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Actief
                    </>
                  ) : subscription.subscription_status === 'past_due' ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Betaling vereist
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      {subscription.subscription_status}
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
                {subscription.next_renewal_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Volgende verlenging</p>
                    <p className="font-semibold">
                      {new Date(subscription.next_renewal_date).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* Start Date */}
                {subscription.subscription_started_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Startdatum</p>
                    <p className="font-semibold">
                      {new Date(subscription.subscription_started_at).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* Total Paid */}
                <div>
                  <p className="text-sm text-muted-foreground">Totaal betaald</p>
                  <p className="font-semibold">
                    €{(subscription.total_paid_amount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Abonnement beheren</CardTitle>
              <CardDescription>
                Update uw betaalmethode, plan of annuleer uw abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManageSubscription}
              >
                Beheer abonnement in Stripe
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                U wordt doorgestuurd naar het Stripe klantenportaal
              </p>
            </CardContent>
          </Card>

          {/* Payment Method */}
          {subscription.subscription_status === 'past_due' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Uw betaling is mislukt. Please <button className="underline font-semibold">update your payment method</button> to restore your subscription.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : null}
    </div>
  );
}
