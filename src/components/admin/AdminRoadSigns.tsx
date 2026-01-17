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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toastSuccess, toastError } from '@/components/ui/sonner';
import { Plus, Pencil, Trash2, Link2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonTable } from '../ui/SkeletonCard';

export function AdminRoadSigns() {
  const queryClient = useQueryClient();
  const { isAdmin, isModerator } = useAuth();
  const [open, setOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedSignForLink, setSelectedSignForLink] = useState<any>(null);
  const [editingSign, setEditingSign] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [formData, setFormData] = useState({
    sign_code: '',
    sign_name: '',
    description: '',
    category: 'verbod',
    image_url: '',
  });

  // Fetch available sign types from database
  const { data: availableSignTypes } = useQuery({
    queryKey: ['available-sign-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('road_signs')
        .select('sign_type')
        .not('sign_type', 'is', null);
      if (error) throw error;
      const uniqueTypes = [...new Set(data.map(r => r.sign_type))].filter(Boolean).sort();
      return uniqueTypes as string[];
    },
  });

  // Fetch road signs with optional type filter
  const { data: roadSigns, isLoading } = useQuery({
    queryKey: ['admin-road-signs', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('road_signs')
        .select('*')
        .order('sign_code');
      
      if (selectedType !== 'all') {
        query = query.eq('sign_type', selectedType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch all feitcodes for linking
  const { data: feitcodes } = useQuery({
    queryKey: ['all-feitcodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feitcodes')
        .select('id, factcode, description')
        .order('factcode');
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked feitcodes for all road signs
  const { data: roadSignLinks } = useQuery({
    queryKey: ['road-sign-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('road_sign_feitcodes')
        .select(`
          id,
          road_sign_id,
          feitcode_id,
          feitcodes (
            id,
            factcode,
            description
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Get links for a specific road sign
  const getLinksForSign = (signId: string) => {
    return roadSignLinks?.filter(link => link.road_sign_id === signId) || [];
  };

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
      toastSuccess(editingSign ? 'Bijgewerkt' : 'Toegevoegd');
    },
    onError: (error: any) => {
      toastError('Fout', error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('road_signs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-road-signs'] });
      toastSuccess('Verwijderd');
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async ({ roadSignId, feitcodeId }: { roadSignId: string; feitcodeId: string }) => {
      const { error } = await supabase
        .from('road_sign_feitcodes')
        .insert([{ road_sign_id: roadSignId, feitcode_id: feitcodeId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['road-sign-links'] });
      toastSuccess('Koppeling toegevoegd');
    },
    onError: (error: any) => {
      toastError('Fout', error.message);
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('road_sign_feitcodes')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['road-sign-links'] });
      toastSuccess('Koppeling verwijderd');
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

  const openLinkDialog = (sign: any) => {
    setSelectedSignForLink(sign);
    setLinkDialogOpen(true);
  };

  // Get feitcodes not yet linked to the selected sign
  const getAvailableFeitcodes = () => {
    if (!selectedSignForLink || !feitcodes) return [];
    const linkedIds = getLinksForSign(selectedSignForLink.id).map(l => l.feitcode_id);
    return feitcodes.filter(f => !linkedIds.includes(f.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
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

      {/* Filter tabs by sign type - only show types that exist */}
      {availableSignTypes && availableSignTypes.length > 0 && (
        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Alle
            </TabsTrigger>
            {availableSignTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
                {type}-borden
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedType === 'all' ? 'Alle verkeerstekens' : `${selectedType}-borden`}
          </CardTitle>
          <CardDescription>
            {roadSigns?.length || 0} verkeerstekens gevonden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="hidden md:table-cell">Categorie</TableHead>
                    <TableHead>Gekoppelde feitcodes</TableHead>
                    <TableHead className="text-right w-32">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roadSigns?.map((sign) => {
                    const links = getLinksForSign(sign.id);
                    return (
                      <TableRow key={sign.id}>
                        <TableCell className="font-mono font-medium">{sign.sign_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{sign.sign_name}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{sign.category}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {links.length > 0 ? (
                              links.map((link: any) => (
                                <Badge 
                                  key={link.id} 
                                  variant="secondary" 
                                  className="text-xs cursor-default group"
                                >
                                  {link.feitcodes?.factcode}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openLinkDialog(sign)}
                              title="Feitcode koppelen"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
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
                    );
                  })}
                  {roadSigns?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Geen verkeerstekens gevonden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feitcode koppelen aan {selectedSignForLink?.sign_code}</DialogTitle>
            <DialogDescription>
              Selecteer een feitcode om te koppelen aan dit verkeersteken
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              onValueChange={(feitcodeId) => {
                if (selectedSignForLink) {
                  addLinkMutation.mutate({
                    roadSignId: selectedSignForLink.id,
                    feitcodeId,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een feitcode" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableFeitcodes().map(fc => (
                  <SelectItem key={fc.id} value={fc.id}>
                    {fc.factcode} - {fc.description?.slice(0, 50)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedSignForLink && (
              <div className="space-y-2">
                <Label>Huidige koppelingen:</Label>
                <div className="flex flex-wrap gap-2">
                  {getLinksForSign(selectedSignForLink.id).map((link: any) => (
                    <Badge 
                      key={link.id} 
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        if (confirm(`Koppeling met ${link.feitcodes?.factcode} verwijderen?`)) {
                          removeLinkMutation.mutate(link.id);
                        }
                      }}
                    >
                      {link.feitcodes?.factcode}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {getLinksForSign(selectedSignForLink.id).length === 0 && (
                    <span className="text-muted-foreground text-sm">Nog geen koppelingen</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
