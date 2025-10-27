import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface FieldOption {
  label: string;
  value: string;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'dropdown' | 'radio';
  options?: FieldOption[];
}

interface FieldOptionsEditorProps {
  fields: FieldConfig[];
  onChange: (fields: FieldConfig[]) => void;
}

export function FieldOptionsEditor({ fields, onChange }: FieldOptionsEditorProps) {
  const [localFields, setLocalFields] = useState<FieldConfig[]>(fields);

  // keep local copy in sync when parent changes fields (e.g. when template sync adds placeholders)
  useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  const updateFields = (newFields: FieldConfig[]) => {
    setLocalFields(newFields);
    onChange(newFields);
  };

  const addField = () => {
    // generate a unique machine name (veld1, veld2, ...)
    const existing = new Set(localFields.map(f => f.name).filter(Boolean));
    let idx = 1;
    while (existing.has(`veld${idx}`)) idx += 1;
    const genName = `veld${idx}`;
    const newField: FieldConfig = {
      name: genName,
      label: `Veld ${idx}`,
      type: 'text',
      options: []
    };
    updateFields([...localFields, newField]);
  };

  const removeField = (index: number) => {
    updateFields(localFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    const newFields = [...localFields];
    newFields[index] = { ...newFields[index], ...updates };
    
    // If changing to text type, remove options
    if (updates.type === 'text') {
      newFields[index].options = [];
    }
    // If changing to dropdown/radio and no options, add empty one
    if ((updates.type === 'dropdown' || updates.type === 'radio') && !newFields[index].options?.length) {
      newFields[index].options = [{ label: '', value: '' }];
    }
    
    updateFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...localFields];
    if (!newFields[fieldIndex].options) {
      newFields[fieldIndex].options = [];
    }
    newFields[fieldIndex].options!.push({ label: '', value: '' });
    updateFields(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...localFields];
    newFields[fieldIndex].options = newFields[fieldIndex].options?.filter((_, i) => i !== optionIndex);
    updateFields(newFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, updates: Partial<FieldOption>) => {
    const newFields = [...localFields];
    if (newFields[fieldIndex].options) {
      newFields[fieldIndex].options![optionIndex] = {
        ...newFields[fieldIndex].options![optionIndex],
        ...updates
      };
    }
    updateFields(newFields);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Velden instellen</h3>
          <p className="text-sm text-muted-foreground">
            Voeg velden toe of gebruik {`{veldnaam}`} in de template. De naam tussen {
            } wordt automatisch ingevuld.
          </p>
        </div>
        {/* <Button type="button" onClick={addField} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Voeg nieuw veld toe
        </Button> */}
      </div>

      {localFields.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Geen velden ingesteld. Voeg een veld toe of zet placeholders in de template.
          </CardContent>
        </Card>
      )}

      {localFields.map((field, fieldIndex) => (
        <Card key={fieldIndex}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">
                  Veld {fieldIndex + 1}
                  {field.name && (
                    <span className="ml-2 font-mono text-sm text-muted-foreground">
                      {`{${field.name}}`}
                    </span>
                  )}
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Weet je zeker dat je dit veld wilt verwijderen?')) {
                    removeField(fieldIndex);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`field-name-${fieldIndex}`}>
                  Veldnaam *
                  <span className="ml-1 text-xs text-muted-foreground">
                    (gebruikt in template)
                  </span>
                </Label>
                <Input
                  id={`field-name-${fieldIndex}`}
                  value={field.name}
                  onChange={(e) => updateField(fieldIndex, { name: e.target.value })}
                  placeholder="bijv. locatie"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`field-label-${fieldIndex}`}>
                  Label *
                  <span className="ml-1 text-xs text-muted-foreground">
                    (zichtbaar voor gebruiker)
                  </span>
                </Label>
                <Input
                  id={`field-label-${fieldIndex}`}
                  value={field.label}
                  onChange={(e) => updateField(fieldIndex, { label: e.target.value })}
                  placeholder="bijv. Locatie"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`field-type-${fieldIndex}`}>Type veld</Label>
              <Select
                value={field.type}
                onValueChange={(value: 'text' | 'dropdown' | 'radio') =>
                  updateField(fieldIndex, { type: value })
                }
              >
                <SelectTrigger id={`field-type-${fieldIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Tekst invoer</SelectItem>
                  <SelectItem value="dropdown">Dropdown menu</SelectItem>
                  <SelectItem value="radio">Radio knoppen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(field.type === 'dropdown' || field.type === 'radio') && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <Label>Opties</Label>
                  <Button
                    type="button"
                    onClick={() => addOption(fieldIndex)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Voeg optie toe
                  </Button>
                </div>

                {field.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={option.label}
                        onChange={(e) =>
                          updateOption(fieldIndex, optionIndex, { label: e.target.value })
                        }
                        placeholder="Label (zichtbaar)"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={option.value}
                        onChange={(e) =>
                          updateOption(fieldIndex, optionIndex, { value: e.target.value })
                        }
                        placeholder="Waarde (in tekst)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Optie verwijderen?')) {
                          removeOption(fieldIndex, optionIndex);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {(!field.options || field.options.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Geen opties. Klik op "Optie toevoegen" om te beginnen.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
