import { useAppSettings } from '@/hooks/useAppSettings';
import { Alert } from '@/components/ui/alert';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Badge removed in favor of clearer inline savings label
import { Check } from "lucide-react";
import {
  STRIPE_PRODUCTS,
  createCheckoutSession,
  redirectToCheckout,
} from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionDialogProps {
  userId: string;
  email: string;
  currentPlan?: "monthly" | "yearly" | null;
  onSubscriptionComplete?: () => void;
}

export function SubscriptionPlans({
  userId,
  email,
  currentPlan,
  onSubscriptionComplete,
}: SubscriptionDialogProps) {
  const { isSubscriptionEnabled, loading: settingsLoading } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    currentPlan || "monthly"
  );
  const { toast } = useToast();

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (currentPlan === plan) {
      toast({
        title: "Al geabonneerd",
        description: `U bent al geabonneerd op het ${
          plan === "monthly" ? "maandplan" : "jaarplan"
        }.`,
      });
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
      const product =
        plan === "monthly" ? STRIPE_PRODUCTS.MONTHLY : STRIPE_PRODUCTS.YEARLY;

      // For demo purposes, we'll use a test price ID
      // In production, you need to create actual Stripe products and prices
      const priceId =
        plan === "monthly"
          ? import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || "price_test_monthly"
          : import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || "price_test_yearly";

      const sessionId = await createCheckoutSession(priceId, userId, email);
      await redirectToCheckout(sessionId);
      onSubscriptionComplete?.();
    } catch (error) {
      
      toast({
        title: "Fout",
        description:
          "Er is een fout opgetreden bij het verwerken van uw abonnement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const features = [
    "Onbeperkte feitcode-suggesties",
    "Opslaan van RVW's (permanent)",
    "Favorieten markeren en beheren",
    "Veilige betalingen via Stripe",
  ];

  const monthly = STRIPE_PRODUCTS.MONTHLY.price;
  const yearly = STRIPE_PRODUCTS.YEARLY.price;
  const annualEquivalent = monthly * 12;
  const savingsAmount = Math.max(0, annualEquivalent - yearly);
  const savingsPercent =
    annualEquivalent > 0
      ? Math.round((savingsAmount / annualEquivalent) * 100)
      : 0;

  const priceDisplay =
    selectedPlan === "monthly"
      ? `€${monthly.toFixed(2)} / maand`
      : `€${yearly.toFixed(2)} / jaar (~€${(yearly / 12).toFixed(2)}/maand)`;
  
  if (!isSubscriptionEnabled && !settingsLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          <div className="font-semibold">Abonnementen uitgeschakeld</div>
          <div className="text-sm text-muted-foreground">Op dit moment zijn abonnementen niet beschikbaar. Probeer het later opnieuw.</div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Upgrade uw account</h2>
        <p className="text-muted-foreground">
          Krijg toegang tot premium functies en onbeperkte suggesties
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Premium abonnement</CardTitle>
              <CardDescription className="mt-1">Toegang tot alle premiumfuncties</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* segmented control */}
              <div className="rounded-full bg-muted p-1 flex items-center w-full sm:w-auto">
                <button
                  className={`flex-1 text-center px-3 py-1 rounded-full text-sm ${
                    selectedPlan === "monthly" ? "bg-background shadow font-semibold" : "text-muted-foreground"
                  }`}
                  onClick={() => setSelectedPlan("monthly")}
                >
                  Maandelijks
                </button>
                <button
                  className={`flex-1 text-center px-3 py-1 rounded-full text-sm ${
                    selectedPlan === "yearly" ? "bg-background shadow font-semibold" : "text-muted-foreground"
                  }`}
                  onClick={() => setSelectedPlan("yearly")}
                >
                  Jaarlijks
                </button>
              </div>

              {selectedPlan === "yearly" && (
                <div className="mt-2 sm:mt-0">
                  <span className="inline-flex items-center text-sm font-semibold text-green-900 bg-green-100 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-lg shadow-sm">
                    Bespaar {savingsPercent}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl sm:text-4xl font-bold leading-tight break-words">{priceDisplay}</div>
            </div>

            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">{feature}</div>
                    {feature.includes("Onbeperkte") && (
                      <div className="text-xs text-muted-foreground">
                        Geen limiet voor abonnees
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm">
                <div className="font-semibold">Waarom kiezen voor Premium?</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Meer suggesties, betere beheeropties en prioriteit bij
                  ondersteuning.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={loading}
                className="w-full"
                variant={currentPlan === selectedPlan ? "outline" : "default"}
              >
                {currentPlan === selectedPlan
                  ? "Huidig plan"
                  : loading
                  ? "Verwerken..."
                  : "Abonneren"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        U kunt uw abonnement op elk moment annuleren. Er zijn geen verborgen
        kosten.
      </div>
    </div>
  );
}
