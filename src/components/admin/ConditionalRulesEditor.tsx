import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'dropdown' | 'radio';
  options?: { label: string; value: string }[];
}

interface ConditionalRule {
  dependsOn: string;
  showWhen: {
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'isEmpty' | 'isNotEmpty';
    value: string;
  };
}

interface ConditionalRulesEditorProps {
  fields: FieldConfig[];
  conditionalRules: Record<string, ConditionalRule>;
  onChange: (rules: Record<string, ConditionalRule>) => void;
}

export function ConditionalRulesEditor({ fields, conditionalRules, onChange }: ConditionalRulesEditorProps) {
  const [localRules, setLocalRules] = useState<Record<string, ConditionalRule>>(conditionalRules);

  useEffect(() => {
    setLocalRules(conditionalRules);
  }, [conditionalRules]);

  const updateRules = (newRules: Record<string, ConditionalRule>) => {
    setLocalRules(newRules);
    onChange(newRules);
  };

  const addRule = () => {
    // Find the first field that doesn't have a rule yet
    const fieldsWithoutRules = fields.filter(f => !localRules[f.name]);
    if (fieldsWithoutRules.length === 0) return;

    const targetField = fieldsWithoutRules[0];
    const sourceField = fields.find(f => f.name !== targetField.name);
    
    if (!sourceField) return;

    const newRules = {
      ...localRules,
      [targetField.name]: {
        dependsOn: sourceField.name,
        showWhen: {
          operator: 'notEquals' as const,
          value: ''
        }
      }
    };
    updateRules(newRules);
  };

  const removeRule = (fieldName: string) => {
    const newRules = { ...localRules };
    delete newRules[fieldName];
    updateRules(newRules);
  };

  const updateRule = (fieldName: string, updates: Partial<ConditionalRule>) => {
    const newRules = {
      ...localRules,
      [fieldName]: {
        ...localRules[fieldName],
        ...updates,
        showWhen: {
          ...localRules[fieldName]?.showWhen,
          ...(updates.showWhen || {})
        }
      }
    };
    updateRules(newRules);
  };

  const getFieldLabel = (fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    return field?.label || fieldName;
  };

  const getFieldOptions = (fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return [];
    if (field.type === 'dropdown' || field.type === 'radio') {
      return field.options || [];
    }
    return [];
  };

  const rulesArray = Object.entries(localRules);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            Voorwaardelijke velden
          </h3>
          <p className="text-sm text-muted-foreground">
            Configureer welke velden alleen zichtbaar zijn onder bepaalde voorwaarden.
          </p>
        </div>
        <Button
          type="button"
          onClick={addRule}
          size="sm"
          variant="outline"
          disabled={fields.length < 2 || rulesArray.length >= fields.length}
        >
          <Plus className="mr-2 h-4 w-4" />
          Regel toevoegen
        </Button>
      </div>

      {rulesArray.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Geen voorwaardelijke regels ingesteld.</p>
            <p className="text-xs mt-1">Alle velden zijn altijd zichtbaar.</p>
          </CardContent>
        </Card>
      )}

      {rulesArray.map(([targetField, rule]) => {
        const dependsOnOptions = getFieldOptions(rule.dependsOn);
        
        return (
          <Card key={targetField}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                    {getFieldLabel(targetField)}
                  </span>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(targetField)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Verberg/toon veld</Label>
                  <Select
                    value={targetField}
                    onValueChange={(newTarget) => {
                      // Move rule to new target
                      const newRules = { ...localRules };
                      delete newRules[targetField];
                      newRules[newTarget] = rule;
                      updateRules(newRules);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields
                        .filter(f => f.name === targetField || !localRules[f.name])
                        .map(f => (
                          <SelectItem key={f.name} value={f.name}>
                            {f.label} ({f.name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Afhankelijk van</Label>
                  <Select
                    value={rule.dependsOn}
                    onValueChange={(value) => updateRule(targetField, { dependsOn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields
                        .filter(f => f.name !== targetField)
                        .map(f => (
                          <SelectItem key={f.name} value={f.name}>
                            {f.label} ({f.name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conditie</Label>
                  <Select
                    value={rule.showWhen.operator}
                    onValueChange={(value: ConditionalRule['showWhen']['operator']) => 
                      updateRule(targetField, { showWhen: { ...rule.showWhen, operator: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Is gelijk aan</SelectItem>
                      <SelectItem value="notEquals">Is niet gelijk aan</SelectItem>
                      <SelectItem value="contains">Bevat</SelectItem>
                      <SelectItem value="notContains">Bevat niet</SelectItem>
                      <SelectItem value="isEmpty">Is leeg</SelectItem>
                      <SelectItem value="isNotEmpty">Is niet leeg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {rule.showWhen.operator !== 'isEmpty' && rule.showWhen.operator !== 'isNotEmpty' && (
                <div className="space-y-2">
                  <Label>Waarde</Label>
                  {dependsOnOptions.length > 0 ? (
                    <Select
                      value={rule.showWhen.value}
                      onValueChange={(value) => 
                        updateRule(targetField, { showWhen: { ...rule.showWhen, value } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een waarde" />
                      </SelectTrigger>
                      <SelectContent>
                        {dependsOnOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} ({opt.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={rule.showWhen.value}
                      onChange={(e) => 
                        updateRule(targetField, { showWhen: { ...rule.showWhen, value: e.target.value } })
                      }
                      placeholder="Voer de waarde in"
                    />
                  )}
                </div>
              )}

              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <strong>Resultaat:</strong> Het veld "{getFieldLabel(targetField)}" wordt{' '}
                <span className="font-medium text-foreground">alleen getoond</span> wanneer{' '}
                "{getFieldLabel(rule.dependsOn)}"{' '}
                {rule.showWhen.operator === 'equals' && `gelijk is aan "${rule.showWhen.value || '...'}"`}
                {rule.showWhen.operator === 'notEquals' && `niet gelijk is aan "${rule.showWhen.value || '...'}"`}
                {rule.showWhen.operator === 'contains' && `"${rule.showWhen.value || '...'}" bevat`}
                {rule.showWhen.operator === 'notContains' && `"${rule.showWhen.value || '...'}" niet bevat`}
                {rule.showWhen.operator === 'isEmpty' && 'leeg is'}
                {rule.showWhen.operator === 'isNotEmpty' && 'niet leeg is'}.
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
