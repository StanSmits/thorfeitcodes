import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { FieldOptionsEditor } from './FieldOptionsEditor';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'dropdown' | 'radio';
  options?: { label: string; value: string }[];
}

export function AdminFeitcodes() {
  const queryClient = useQueryClient();
  const { isAdmin, isModerator } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    factcode: '',
    description: '',
    template: '',
  });
  const [fields, setFields] = useState<FieldConfig[]>([]);

  // helper: extract placeholders like {veldnaam} from template
  const extractPlaceholders = (template: string) => {
    const re = /\{([^}]+)\}/g;
    const set = new Set<string>();
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(template))) {
      set.add(m[1].trim());
    }
    return Array.from(set).filter(Boolean);
  };

  // when template changes, auto-add missing fields for placeholders
  useEffect(() => {
    const placeholders = extractPlaceholders(formData.template || '');
    if (!placeholders.length) return;
    setFields((current) => {
      // map existing fields by name for quick lookup
      const existingMap = new Map(current.map((f) => [f.name, f]));

      // build ordered list based on placeholders order
      const ordered: FieldConfig[] = placeholders.map((ph) => {
        const existing = existingMap.get(ph);
        if (existing) return existing;
        const label = ph.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return { name: ph, label, type: 'text', options: [] };
      });

      // append any existing fields that are not present in the template (preserve their current order)
      current.forEach((f) => {
        if (!placeholders.includes(f.name)) ordered.push(f);
      });

      return ordered;
    });
  }, [formData.template]);

  const { data: feitcodes, isLoading } = useQuery({
    queryKey: ['admin-feitcodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feitcodes')
        .select('*')
        .order('factcode');
      if (error) throw error;
      return data;
    },
  });

  const filteredFeitcodes = feitcodes?.filter((code) => {
    const search = searchQuery.toLowerCase();
    return (
      code.factcode?.toLowerCase().includes(search) ||
      code.description?.toLowerCase().includes(search)
    );
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Convert fields to field_options and field_tooltips format
      const field_options: Record<string, any> = {};
      const field_tooltips: Record<string, string> = {};

      fields.forEach(field => {
        field_tooltips[field.name] = field.label;
        
        if (!field.name) return; // skip invalid

        if (field.type === 'text') {
          // represent text fields explicitly so UI/backend know it's a text input
          field_options[field.name] = { type: 'text' };
        } else if (field.type === 'dropdown') {
          field_options[field.name] = field.options || [];
        } else if (field.type === 'radio') {
          field_options[field.name] = {
            type: 'radio',
            options: field.options || []
          };
        }
      });

      const payload = {
        ...formData,
        field_options,
        field_tooltips,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('feitcodes')
          .update(payload)
          .eq('id', editingCode.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('feitcodes').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feitcodes'] });
      setOpen(false);
      resetForm();
      toast({
        title: editingCode ? 'Bijgewerkt' : 'Toegevoegd',
        description: `Feitcode is succesvol ${editingCode ? 'bijgewerkt' : 'toegevoegd'}.`,
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
      const { error } = await supabase.from('feitcodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feitcodes'] });
      toast({
        title: 'Verwijderd',
        description: 'Feitcode is succesvol verwijderd.',
      });
    },
  });

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      factcode: '',
      description: '',
      template: '',
    });
    setFields([]);
  };

  const handleEdit = (code: any) => {
    setEditingCode(code);
    setFormData({
      factcode: code.factcode,
      description: code.description || '',
      template: code.template || '',
    });
    
    // Convert field_options and field_tooltips back to FieldConfig array
    const fieldOptions = code.field_options || {};
    const fieldTooltips = code.field_tooltips || {};
    const convertedFields: FieldConfig[] = [];
    
    Object.keys(fieldOptions).forEach(fieldName => {
      const option = fieldOptions[fieldName];
      const field: FieldConfig = {
        name: fieldName,
        label: fieldTooltips[fieldName] || fieldName,
        type: 'text',
        options: []
      };
      
      if (option === null || (typeof option === 'object' && option.type === 'text')) {
        // older saved formats used null; newer format may use { type: 'text' }
        field.type = 'text';
      } else if (Array.isArray(option)) {
        field.type = 'dropdown';
        field.options = option;
      } else if (typeof option === 'object' && option.type === 'radio') {
        field.type = 'radio';
        field.options = option.options || [];
      }
      
      convertedFields.push(field);
    });
    
    setFields(convertedFields);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation: required elements
    if (!formData.factcode?.trim()) {
      toast({ title: 'Fout', description: 'Feitcode is verplicht.', variant: 'destructive' });
      return;
    }

    const template = String(formData.template || '');

    // Ensure each field has a name and label
    for (const f of fields) {
      if (!f.name || !f.name.trim()) {
        toast({ title: 'Fout', description: 'Een veld mist een naam. Geef een geldige veldnaam op.', variant: 'destructive' });
        return;
      }
      if (!f.label || !f.label.trim()) {
        toast({ title: 'Fout', description: `Veld "${f.name}" mist een label. Vul het label in.`, variant: 'destructive' });
        return;
      }

      if ((f.type === 'dropdown' || f.type === 'radio')) {
        if (!f.options || f.options.length === 0) {
          toast({ title: 'Fout', description: `Veld "${f.name}" heeft geen opties. Voeg minstens één optie toe.`, variant: 'destructive' });
          return;
        }
        for (const opt of f.options) {
          if (!opt.label || !opt.label.trim() || !opt.value || !opt.value.trim()) {
            toast({ title: 'Fout', description: `Een optie in veld "${f.name}" mist een label of waarde.`, variant: 'destructive' });
            return;
          }
        }
      }
    }

    // Validate that all field names are used in template (warning only)
    const unusedFields = fields.filter(field => !template.includes(`{${field.name}}`));
    if (unusedFields.length > 0) {
      toast({
        title: 'Waarschuwing',
        description: `De volgende velden worden niet gebruikt in de template: ${unusedFields.map(f => f.name).join(', ')}`,
        variant: 'default',
      });
      // continue to save even when warning; if you want to block, return here
    }

    saveMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Feitcodes beheren</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe feitcode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCode ? 'Feitcode bewerken' : 'Nieuwe feitcode'}
              </DialogTitle>
              <DialogDescription>
                Vul de gegevens in voor de feitcode
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="factcode">Feitcode *</Label>
                <Input
                  id="factcode"
                  value={formData.factcode}
                  onChange={(e) => setFormData({ ...formData, factcode: e.target.value })}
                  placeholder="bijv. R315B"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Korte beschrijving van de feitcode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Template *</Label>
                <Textarea
                  id="template"
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  rows={8}
                  placeholder="Gebruik {veldnaam} voor dynamische velden. Bijvoorbeeld: Op {datum} om {tijdstip} te {locatie}..."
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Gebruik {`{veldnaam}`} waar gebruikers iets moeten invullen. Velden worden
                  automatisch toegevoegd op basis van deze placeholders.
                </p>
              </div>

              <div className="border-t pt-4">
                <FieldOptionsEditor fields={fields} onChange={setFields} />
                <p className="text-sm text-muted-foreground mt-2">Tip: kies bij dropdown/radio de opties en vul label en waarde in.</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Bezig met opslaan...' : 'Sla feitcode op'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Sluiten
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle feitcodes</CardTitle>
          <CardDescription>
            Overzicht van alle feitcodes in het systeem
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Zoek op feitcode of omschrijving..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeitcodes?.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono">{code.factcode}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {code.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(code)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isModerator && !isAdmin}
                          onClick={() => {
                            if (isModerator && !isAdmin) {
                              toast({
                                title: 'Geen toestemming',
                                description: 'Moderators kunnen geen feitcodes verwijderen.',
                                variant: 'destructive',
                              });
                              return;
                            }

                            if (confirm('Weet u zeker dat u deze feitcode wilt verwijderen?')) {
                              deleteMutation.mutate(code.id);
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