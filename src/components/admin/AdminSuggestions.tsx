import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toastSuccess, toastDeleted } from '@/components/ui/sonner';
import { Check, X, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonTable } from '../ui/SkeletonCard';

interface AdminSuggestionsProps {
  onApprove?: (suggestion: any) => void;
}

export function AdminSuggestions({ onApprove }: AdminSuggestionsProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isModerator } = useAuth();


  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['admin-suggestions'],
    queryFn: async () => {
      // Fetch pending suggestions (only required columns)
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('factcode_suggestions')
        .select('id, suggested_code, description, created_at, status')
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (suggestionsError) throw suggestionsError;

      // Fetch existing factcodes to exclude suggestions that already exist
      const { data: existingFactcodes = [], error: factcodesError } = await supabase
        .from('feitcodes')
        .select('factcode')
        .is('deleted_at', null);

      if (factcodesError) throw factcodesError;

      const existingSet = new Set((existingFactcodes as any[]).map((f) => String(f.factcode)));

      // Return only suggestions whose suggested_code is not present in feitcodes
      return (suggestionsData || []).filter((s: any) => !existingSet.has(String(s.suggested_code)));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase
        .from('factcode_suggestions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] });
      toastSuccess('Status bijgewerkt');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('factcode_suggestions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] });
      toastDeleted('Suggestie');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: 'In behandeling',
      approved: 'Goedgekeurd',
      rejected: 'Afgewezen',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Suggesties beheren</h2>

      <Card>
        <CardHeader>
          <CardTitle>Alle suggesties</CardTitle>
          <CardDescription>
            Overzicht van ingediende suggesties voor nieuwe feitcodes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : suggestions?.length === 0 ? (
            <p className="text-center text-muted-foreground">Geen suggesties gevonden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions?.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell className="font-mono">
                      {suggestion.suggested_code}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {suggestion.description}
                    </TableCell>
                    <TableCell>{getStatusBadge(suggestion.status || 'pending')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {suggestion.status !== 'approved' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                onApprove(suggestion);
                              }}
                              title="Goedkeuren en feitcode aanmaken"
                            >
                              <Plus className="h-4 w-4 text-green-600" />
                            </Button>
                          </>
                        )}
                        {suggestion.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: suggestion.id,
                                status: 'rejected',
                              })
                            }
                            title="Afwijzen"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}