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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { FieldOptionsEditor } from './FieldOptionsEditor';
import { Badge } from '@/components/ui/badge';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'dropdown' | 'radio';
  options?: { label: string; value: string }[];
}

interface AdminFeitcodesProps {
  prefillData?: any;
  onClearPrefill?: () => void;
}

export function AdminFeitcodes({ prefillData, onClearPrefill }: AdminFeitcodesProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isModerator } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('default');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);
  const [formData, setFormData] = useState({
    factcode: '',
    description: '',
    template: '',
    location_field: '',
    image_url: '',
    tooltip_text: '',
  });
  const [fields, setFields] = useState<FieldConfig[]>([]);

  // Handle prefill data from approved suggestions
  useEffect(() => {
    if (prefillData) {
      setFormData({
        factcode: prefillData.factcode || '',
        description: prefillData.description || '',
        template: prefillData.template || '',
        location_field: prefillData.location_field || '',
        image_url: prefillData.image_url || '',
        tooltip_text: prefillData.tooltip_text || '',
      });
      
      // Convert field_options to FieldConfig array if provided
      if (prefillData.field_options) {
        const fieldOptions = prefillData.field_options;
        const convertedFields: FieldConfig[] = [];
        
        Object.keys(fieldOptions).forEach(fieldName => {
          const option = fieldOptions[fieldName];
          const field: FieldConfig = {
            name: fieldName,
            label: fieldName.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            type: 'text',
            options: []
          };
          
          if (Array.isArray(option)) {
            field.type = 'dropdown';
            field.options = option;
          } else if (typeof option === 'object' && option.type === 'radio') {
            field.type = 'radio';
            field.options = option.options || [];
          }
          
          convertedFields.push(field);
        });
        
        setFields(convertedFields);
      }
      
      setOpen(true);
      
      if (onClearPrefill) {
        onClearPrefill();
      }
    }
  }, [prefillData, onClearPrefill]);

  // helper: extract placeholders like {veldnaam} from template
  const extractPlaceholders = (template: string) => {
    const re = /\{([^}]+)\}/g;
    const set = new Set<string>();
    let m;
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

  // fetch available road signs so admin can pick one to associate with the feitcode
  const { data: roadSigns = [] } = useQuery({
    queryKey: ['road-signs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('road_signs')
        .select('sign_code, sign_name, image_url')
        .order('sign_code');
      if (error) throw error;
      return data;
    },
  });

  const getCategoryFromCode = (factcode: string): string => {
    if (!factcode) return 'overig';
    const upper = factcode.toUpperCase();
    if (upper.startsWith('BA')) return 'bestuurlijk-ba';
    if (upper.startsWith('BS')) return 'bestuurlijk-bs';
    if (upper.startsWith('R')) return 'mulder';
    return 'overig';
  };

  const filteredFeitcodes = useMemo(() => {
    const list = (feitcodes || []).filter((code) => {
      const search = String(searchQuery).toLowerCase();
      const matchesSearch = 
        String(code.factcode || '').toLowerCase().includes(search) ||
        String(code.description || '').toLowerCase().includes(search);
      
      if (!matchesSearch) return false;
      if (categoryFilter === 'all') return true;
      return getCategoryFromCode(code.factcode) === categoryFilter;
    });

    // Apply sorting based on selected option
    const sorted = [...list];
    sorted.sort((a: any, b: any) => {
      switch (sortOption) {
        case 'popularity': {
          const av = Number(a.access_count || 0);
          const bv = Number(b.access_count || 0);
          return bv - av; // desc
        }
        case 'name_asc': {
          const av = String(a.factcode || '').toLowerCase();
          const bv = String(b.factcode || '').toLowerCase();
          return av.localeCompare(bv);
        }
        case 'name_desc': {
          const av = String(a.factcode || '').toLowerCase();
          const bv = String(b.factcode || '').toLowerCase();
          return bv.localeCompare(av);
        }
        case 'created_desc': {
          // fallback if created_at not present
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bd - ad;
        }
        case 'created_asc': {
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ad - bd;
        }
        default:
          // default: keep original order from server (as returned)
          return 0;
      }
    });

    return sorted;
  }, [feitcodes, searchQuery, categoryFilter, sortOption]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const totalPages = itemsPerPage === 'all' 
    ? 1 
    : Math.ceil(filteredFeitcodes.length / itemsPerPage);

  const paginatedFeitcodes = useMemo(() => {
    if (itemsPerPage === 'all') {
      return filteredFeitcodes;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredFeitcodes.slice(startIndex, endIndex);
  }, [filteredFeitcodes, currentPage, itemsPerPage]);

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleItemsPerPageChange = (value: string) => {
    if (value === 'all') {
      setItemsPerPage('all');
      setCurrentPage(1);
    } else {
      setItemsPerPage(parseInt(value));
      setCurrentPage(1);
    }
  };

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
        location_field: formData.location_field || null,
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
      location_field: '',
      template: '',
      image_url: '',
      tooltip_text: '',
    });
    setFields([]);
  };

  const handleEdit = (code: any) => {
    setEditingCode(code);
    setFormData({
      factcode: code.factcode,
      description: code.description || '',
      template: code.template || '',
      location_field: code.location_field || '',
      image_url: code.image_url || '',
      tooltip_text: code.tooltip_text || '',
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

              <div className="space-y-2">
                <Label htmlFor="location_field">Locatie veld (voor opslaan recente RvW's)</Label>
                <Select
                  value={formData.location_field || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, location_field: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger id="location_field">
                    <SelectValue placeholder="Selecteer het veld dat de locatie bevat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen locatie veld</SelectItem>
                    {fields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecteer welk veld gebruikt moet worden als hoofdlocatie voor het opslaan van recente RvW's.
                </p>
              </div>

              {/* Road sign selector - pick a sign from road_signs to show in header */}
              <div className="space-y-2">
                <Label htmlFor="road_sign">Toon verkeersbord (optioneel)</Label>
                <Select
                  value={
                    (formData.image_url && roadSigns.find((r: any) => r.image_url === formData.image_url)?.sign_code) || '__none__'
                  }
                  onValueChange={(value) => {
                    if (value === '__none__') {
                      setFormData({ ...formData, image_url: '', tooltip_text: '' });
                    } else {
                      const rs = roadSigns.find((r: any) => r.sign_code === value);
                      setFormData({
                        ...formData,
                        image_url: rs?.image_url || '',
                        tooltip_text: rs?.sign_name || '',
                      });
                    }
                  }}
                >
                  <SelectTrigger id="road_sign">
                    <SelectValue placeholder="Selecteer een verkeersbord" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen verkeersbord</SelectItem>
                    {[...roadSigns]
                      .sort((a: any, b: any) => a.sign_code.localeCompare(b.sign_code))
                      .map((rs: any) => (
                      <SelectItem key={rs.sign_code} value={rs.sign_code} className='group'>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground group-hover:text-white">{rs.sign_code}</span>
                          <span className="text-sm text-foreground group-hover:text-white">{rs.sign_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Preview of selected sign */}
                {formData.image_url && (
                  <div className="mt-2">
                    <Label>Preview</Label>
                    <div className="mt-1 w-24 h-24 rounded overflow-hidden bg-muted flex items-center justify-center">
                      <img src={formData.image_url} alt={formData.tooltip_text || 'verkeersbord'} className="w-full h-full object-contain" />
                    </div>
                    {formData.tooltip_text && (
                      <p className="text-xs text-muted-foreground mt-1">{formData.tooltip_text}</p>
                    )}
                  </div>
                )}
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
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Zoek op feitcode of omschrijving..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Filter op categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>Alle categorieën</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bestuurlijk-ba">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">BA</Badge>
                      <span>Bestuurlijke boetes (BA)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bestuurlijk-bs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">BS</Badge>
                      <span>Bestuurlijke boetes (BS)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mulder">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">R</Badge>
                      <span>Mulder codes (R)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="overig">
                    <div className="flex items-center gap-2">
                      <span>Overige</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Sorteren op" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standaard</SelectItem>
                  <SelectItem value="popularity">Populariteit</SelectItem>
                  <SelectItem value="name_asc">Naam A-Z</SelectItem>
                  <SelectItem value="name_desc">Naam Z-A</SelectItem>
                  <SelectItem value="created_desc">Aangemaakt (nieuw → oud)</SelectItem>
                  <SelectItem value="created_asc">Aangemaakt (oud → nieuw)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Laden...</p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="w-[140px]">Code</TableHead>
                      <TableHead>Omschrijving</TableHead>
                      <TableHead className="w-[100px] text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeitcodes?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Geen feitcodes gevonden
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFeitcodes?.map((code) => {
                      const isExpanded = expandedRows.has(code.id);
                      const hasDescription = code.description && code.description.length > 0;
                      
                      return (
                        <>
                          <TableRow 
                            key={code.id} 
                            className={`group ${hasDescription ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                            onClick={() => hasDescription && toggleRowExpansion(code.id)}
                          >
                            <TableCell className="py-3">
                              {hasDescription && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpansion(code.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium py-3">
                              {code.factcode}
                            </TableCell>
                            <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="max-w-2xl truncate text-sm text-muted-foreground">
                                {code.description || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                {!isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(code)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Bewerken</span>
                                </Button>
                                )}
                                {isAdmin && !isExpanded && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Weet u zeker dat u deze feitcode wilt verwijderen?')) {
                                        deleteMutation.mutate(code.id);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Verwijderen</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && hasDescription && (
                            <TableRow key={`${code.id}-expanded`} className="bg-muted/30">
                              <TableCell colSpan={4} className="py-4">
                                <div className="px-4">
                                  <h4 className="font-semibold text-sm mb-2">Volledige omschrijving:</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {code.description}
                                  </p>
                                  <div className="flex justify-start md:justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(code)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Bewerken</span>
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Weet u zeker dat u deze feitcode wilt verwijderen?')) {
                                        deleteMutation.mutate(code.id);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Verwijderen</span>
                                  </Button>
                                )}
                              </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {filteredFeitcodes.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Items per pagina:
                  </span>
                  <Select
                    value={itemsPerPage === 'all' ? 'all' : itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="all">Alles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {itemsPerPage === 'all' 
                      ? `${filteredFeitcodes.length} van ${filteredFeitcodes.length}`
                      : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredFeitcodes.length)} van ${filteredFeitcodes.length}`
                    }
                  </span>
                </div>

                {itemsPerPage !== 'all' && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      Eerste
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Vorige
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-9"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Volgende
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Laatste
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}