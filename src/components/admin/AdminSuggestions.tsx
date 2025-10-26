import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

export function AdminSuggestions() {
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['admin-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factcode_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
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
      toast({
        title: 'Status bijgewerkt',
        description: 'De status van de suggestie is bijgewerkt.',
      });
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
      toast({
        title: 'Verwijderd',
        description: 'De suggestie is verwijderd.',
      });
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
            <p className="text-center text-muted-foreground">Laden...</p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: suggestion.id,
                                status: 'approved',
                              })
                            }
                            title="Goedkeuren"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Weet u zeker dat u deze suggestie wilt verwijderen?')) {
                              deleteMutation.mutate(suggestion.id);
                            }
                          }}
                          title="Verwijderen"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
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