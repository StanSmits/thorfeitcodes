import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AdminRoadSigns() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSign, setEditingSign] = useState<any>(null);
  const [formData, setFormData] = useState({
    sign_code: '',
    sign_name: '',
    description: '',
    category: 'verbod',
    image_url: '',
  });

  const { data: roadSigns, isLoading } = useQuery({
    queryKey: ['admin-road-signs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('road_signs')
        .select('*')
        .order('sign_code');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSign) {
        const { error } = await supabase
          .from('road_signs')
          .update(data)
          .eq('id', editingSign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('road_signs').insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-road-signs'] });
      setOpen(false);
      resetForm();
      toast({
        title: editingSign ? 'Bijgewerkt' : 'Toegevoegd',
        description: `Verkeersteken is succesvol ${editingSign ? 'bijgewerkt' : 'toegevoegd'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fout',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('road_signs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-road-signs'] });
      toast({
        title: 'Verwijderd',
        description: 'Verkeersteken is succesvol verwijderd.',
      });
    },
  });

  const resetForm = () => {
    setEditingSign(null);
    setFormData({
      sign_code: '',
      sign_name: '',
      description: '',
      category: 'verbod',
      image_url: '',
    });
  };

  const handleEdit = (sign: any) => {
    setEditingSign(sign);
    setFormData({
      sign_code: sign.sign_code,
      sign_name: sign.sign_name,
      description: sign.description || '',
      category: sign.category,
      image_url: sign.image_url || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const { isAdmin, isModerator } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Verkeerstekens beheren</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nieuw verkeersteken
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSign ? 'Verkeersteken bewerken' : 'Nieuw verkeersteken'}
              </DialogTitle>
              <DialogDescription>
                Vul de gegevens in voor het verkeersteken (RVV 1990)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sign_code">Code *</Label>
                <Input
                  id="sign_code"
                  value={formData.sign_code}
                  onChange={(e) => setFormData({ ...formData, sign_code: e.target.value })}
                  placeholder="B1, C1, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sign_name">Naam *</Label>
                <Input
                  id="sign_name"
                  value={formData.sign_name}
                  onChange={(e) => setFormData({ ...formData, sign_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verbod">Verbodsborden</SelectItem>
                    <SelectItem value="gebod">Gebodsborden</SelectItem>
                    <SelectItem value="voorrang">Voorrangsborden</SelectItem>
                    <SelectItem value="waarschuwing">Waarschuwingsborden</SelectItem>
                    <SelectItem value="aanwijzing">Aanwijzingsborden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Afbeelding URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Bezig...' : 'Opslaan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle verkeerstekens</CardTitle>
          <CardDescription>
            Overzicht van alle verkeerstekens (RVV 1990)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roadSigns?.map((sign) => (
                  <TableRow key={sign.id}>
                    <TableCell className="font-mono">{sign.sign_code}</TableCell>
                    <TableCell>{sign.sign_name}</TableCell>
                    <TableCell className="capitalize">{sign.category}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sign)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isAdmin && isModerator}
                          onClick={() => {
                            if (confirm('Weet u zeker dat u dit verkeersteken wilt verwijderen?')) {
                              deleteMutation.mutate(sign.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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