import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RVWGenerator } from '@/components/RVWGenerator';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function Generator() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialFormValues, setInitialFormValues] = useState<Record<string, string> | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // Check for prefilled form values and search query from navigation state
  useEffect(() => {
    const state = location.state as { formValues?: Record<string, string>; searchQuery?: string } | null;
    if (state?.formValues) {
      setInitialFormValues(state.formValues);
    }
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
    }
  }, [location.state]);

  const { data: factcode, isLoading, error } = useQuery({
    queryKey: ['feitcode', code],
    queryFn: async () => {
      if (!code) {
        throw new Error('Geen feitcode opgegeven');
      }

      const { data, error } = await supabase
        .from('feitcodes')
        .select('*')
        .eq('factcode', code.toUpperCase())
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Feitcode niet gevonden');
      }

      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Handle error - redirect to search with toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Feitcode niet gevonden',
        description: `De feitcode "${code}" bestaat niet of is verwijderd.`,
        variant: 'destructive',
      });
      navigate('/', { replace: true });
    }
  }, [error, code, navigate]);

  const handleBack = () => {
    // Check if there's history to go back to, otherwise go to search
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // While redirecting after error, show nothing
  if (error || !factcode) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">Feitcode wordt geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={searchQuery ? `/?q=${encodeURIComponent(searchQuery)}` : '/'}>Zoeken</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {searchQuery && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/?q=${encodeURIComponent(searchQuery)}`} className="text-muted-foreground">
                    "{searchQuery}"
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{factcode.factcode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <RVWGenerator
        factcode={factcode}
        onBack={handleBack}
        initialFormValues={initialFormValues}
      />
    </div>
  );
}
