import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Coffee, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { redirectToCheckout } from '@/lib/stripe';

interface DonationCardProps {
  userId: string;
  email: string;
}

const PRESET_AMOUNTS = [
  { value: 5, label: '€5', icon: Coffee },
  { value: 10, label: '€10', icon: Heart },
  { value: 25, label: '€25', icon: Gift },
];

export function DonationCard({ userId, email }: DonationCardProps) {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimals
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setCustomAmount(sanitized);
    setSelectedPreset(null);
  };

  const getAmountInCents = (): number | null => {
    if (selectedPreset) {
      return selectedPreset * 100;
    }
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000) {
        return Math.round(parsed * 100);
      }
    }
    return null;
  };

  const handleDonate = async () => {
    const amountInCents = getAmountInCents();
    
    if (!amountInCents) {
      toast({
        title: 'Ongeldig bedrag',
        description: 'Voer een bedrag tussen €1 en €1000 in.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://jsptozrmlibvxzfkvrec.supabase.co/functions/v1/create-donation-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: amountInCents,
            userId,
            email,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create donation session');
      }

      const { sessionUrl, sessionId } = await response.json();
      await redirectToCheckout(sessionUrl || sessionId);
    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het verwerken van uw donatie.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const amountInCents = getAmountInCents();
  const isValidAmount = amountInCents !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Doneer
        </CardTitle>
        <CardDescription>
          Steun de ontwikkeling van de RVW Generator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset amounts */}
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={selectedPreset === value ? 'default' : 'outline'}
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => handlePresetClick(value)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Of voer een eigen bedrag in:</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Bijv. 15"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimaal €1, maximaal €1000</p>
        </div>

        {/* Donate button */}
        <Button
          onClick={handleDonate}
          disabled={!isValidAmount || loading}
          className="w-full"
          variant="default"
        >
          {loading ? 'Verwerken...' : isValidAmount 
            ? `Doneer €${(amountInCents! / 100).toFixed(2)}` 
            : 'Selecteer een bedrag'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Eenmalige betaling via Stripe. Geen abonnement.
        </p>
      </CardContent>
    </Card>
  );
}
