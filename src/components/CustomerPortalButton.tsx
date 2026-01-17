import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toastError } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { invalidateSubscriptionCache } from '@/hooks/useSubscription';

interface CustomerPortalButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
}

export function CustomerPortalButton({ variant = 'outline', className }: CustomerPortalButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    if (!user?.id) {
      toastError('Niet ingelogd', 'Log in om uw abonnement te beheren.');
      return;
    }

    setLoading(true);
    
    // Invalidate cache so subscription status is refreshed when user returns
    invalidateSubscriptionCache();
    
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId: user.id },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create portal session');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toastError('Fout', error instanceof Error ? error.message : 'Kon portaal niet openen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleOpenPortal}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Laden...
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Abonnement beheren
        </>
      )}
    </Button>
  );
}
