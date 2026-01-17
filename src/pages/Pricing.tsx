import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { CustomerPortalButton } from '@/components/CustomerPortalButton';
import { DonationCard } from '@/components/DonationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';

export default function Pricing() {
  const { user } = useAuth();
  const { subscription, isSubscribed, currentPlan, currentPeriodEnd, cancelAtPeriodEnd, loading } = useSubscription();
  const location = useLocation();

  // If user is not signed in, redirect to auth page (preserve return path)
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const { isSubscriptionEnabled } = useAppSettings();

  if (!isSubscriptionEnabled) {
    return (
      <Layout showForAnonymous>
        <div className="container mx-auto py-6 space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Zoeken</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Doneren</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="max-w-md mx-auto">
            <DonationCard userId={user.id} email={user.email || ''} />
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
                <Card className="max-w-3xl mx-auto">
                  <CardHeader>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ) : isSubscribed ? (
                // Show subscriber-only view without plan switching
                <Card className="max-w-3xl mx-auto border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300">
                      U bent al abonnee! 🎉
                    </CardTitle>
                    <CardDescription>
                      U heeft toegang tot alle premium functies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Huidig plan</span>
                        <span className="font-semibold">
                          {currentPlan === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
                        </span>
                      </div>
                      {currentPeriodEnd && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {cancelAtPeriodEnd ? 'Eindigt op' : 'Volgende verlenging'}
                          </span>
                          <span className="font-semibold">
                            {new Date(currentPeriodEnd).toLocaleDateString('nl-NL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <CustomerPortalButton className="w-full" variant="default" />
                      <p className="text-xs text-muted-foreground text-center">
                        Beheer uw betaalmethode, bekijk facturen of annuleer uw abonnement
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
              {/* Donation Card */}
              <DonationCard userId={user.id} email={user.email || ''} />

              {/* FAQ Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Veelgestelde vragen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
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
                    <a href={`mailto:rvw@stansmits.nl?subject=Contact%20in%20verband%20met%20abonnement&body=${user?.id}`}>Contact opnemen</a>
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
