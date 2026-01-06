import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout } from '@/components/Layout';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export default function Pricing() {
  const { user } = useAuth();
  const { subscription, isSubscribed, currentPlan, loading } = useSubscription();
  const location = useLocation();

  // If user is not signed in, redirect to auth page (preserve return path)
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const { isSubscriptionEnabled } = useAppSettings();

  if (!isSubscriptionEnabled) {
    return (
      <Layout showForAnonymous>
        <div className="container mx-auto py-12">
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Abonnementen tijdelijk uitgeschakeld</CardTitle>
                <CardDescription className="mt-1">Momenteel zijn abonnementen niet beschikbaar. Probeer het later opnieuw.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/">Terug naar zoeken</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showForAnonymous>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Zoeken</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Abonnementen</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="container mx-auto py-6 space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Laden...</p>
                </div>
              ) : (
                <SubscriptionPlans
                  userId={user?.id}
                  email={user?.email || ''}
                  currentPlan={currentPlan}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Current subscription status */}
              {isSubscribed && subscription && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-900 dark:text-green-100">
                      Actief abonnement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <div>
                      <span className="font-semibold">Plan:</span>{' '}
                      {currentPlan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
                    </div>
                    {subscription.next_renewal_date && (
                      <div>
                        <span className="font-semibold">Volgende verlenging:</span>{' '}
                        {new Date(subscription.next_renewal_date).toLocaleDateString('nl-NL')}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className="capitalize">
                        {subscription.subscription_status === 'active' ? 'Actief' : subscription.subscription_status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* FAQ Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Veelgestelde vragen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Kan ik upgraden/downgraden?</h4>
                    <p className="text-muted-foreground">
                      Ja, u kunt op elk moment van plan wisselen. De wijziging gaat per direct in.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Kan ik mijn abonnement opzeggen?</h4>
                    <p className="text-muted-foreground">
                      Ja, u kunt uw abonnement op elk moment opzeggen. U blijft toegang hebben tot het einde van uw factureringsperiode.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Welke betaalmethoden accepteert u?</h4>
                    <p className="text-muted-foreground">
                      We accepteren alle grote creditcards en betaalmethoden via Stripe.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Support card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vragen?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Als u vragen heeft over uw abonnement, neem dan contact met ons op.
                  </p>
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link to="/settings">Contact opnemen</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
