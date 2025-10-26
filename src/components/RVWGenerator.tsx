import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RVWGeneratorProps {
  factcode: any;
  onBack: () => void;
}

export function RVWGenerator({ factcode, onBack }: RVWGeneratorProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Increment access count
    const incrementCount = async () => {
      await supabase.rpc('increment_access_count', { item_id: factcode.factcode });
    };
    incrementCount();
  }, [factcode.factcode]);

  const fieldOptions = factcode.field_options || {};
  const fieldTooltips = factcode.field_tooltips || {};

  // Extract field names from template in order of appearance
  const orderedFields = useMemo(() => {
    const template = factcode.template || '';
    const matches = template.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    const seen = new Set<string>();
    return matches
      .map(match => match.slice(1, -1))
      .filter(field => {
        if (seen.has(field)) return false;
        seen.add(field);
        return true;
      });
  }, [factcode.template]);

  // Auto-generate text as form values change
  const generatedText = useMemo(() => {
    let result = factcode.template || '';
    
    Object.entries(formValues).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return result;
  }, [formValues, factcode.template]);

  // Update form value and auto-generate
  const updateFormValue = (fieldName: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCopy = () => {
    // Copy the clean version without highlighting
    const cleanText = generatedText.replace(/\{[^}]+\}/g, (match) => match);
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    toast({
      title: "Gekopieerd",
      description: "De tekst is naar het klembord gekopieerd.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const renderField = (fieldName: string, options: any) => {
    const label = fieldTooltips[fieldName] || fieldName;
    
    if (Array.isArray(options)) {
      // Check if options have label/value structure
      const hasLabelValue = options.length > 0 && typeof options[0] === 'object' && 'label' in options[0];
      
      // Dropdown
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{label}</Label>
          <Select
            value={formValues[fieldName] || ''}
            onValueChange={(value) => updateFormValue(fieldName, value)}
          >
            <SelectTrigger id={fieldName}>
              <SelectValue placeholder="Selecteer een optie" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => {
                const optionValue = hasLabelValue ? option.value : option;
                const optionLabel = hasLabelValue ? option.label : option;
                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    {optionLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (typeof options === 'object' && options.type === 'radio') {
      const hasLabelValue = options.options?.length > 0 && typeof options.options[0] === 'object' && 'label' in options.options[0];
      
      // Radio buttons
      return (
        <div key={fieldName} className="space-y-3">
          <Label>{label}</Label>
          <RadioGroup
            value={formValues[fieldName] || ''}
            onValueChange={(value) => updateFormValue(fieldName, value)}
          >
            {options.options.map((option: any) => {
              const optionValue = hasLabelValue ? option.value : option;
              const optionLabel = hasLabelValue ? option.label : option;
              return (
                <div key={optionValue} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionValue} id={`${fieldName}-${optionValue}`} />
                  <Label htmlFor={`${fieldName}-${optionValue}`} className="font-normal">
                    {optionLabel}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      );
    } else {
      // Free text input
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{label}</Label>
          <Input
            id={fieldName}
            value={formValues[fieldName] || ''}
            onChange={(e) => updateFormValue(fieldName, e.target.value)}
            placeholder={`Voer ${label.toLowerCase()} in`}
          />
        </div>
      );
    }
  };

  // Render generated text with highlighted unfilled fields
  const renderGeneratedTextWithHighlights = () => {
    const template = factcode.template || '';
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const placeholderRegex = /\{([^}]+)\}/g;
    let match;
    let key = 0;

    while ((match = placeholderRegex.exec(template)) !== null) {
      const fieldName = match[1];
      const matchStart = match.index;
      
      // Add text before placeholder
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {template.substring(lastIndex, matchStart)}
          </span>
        );
      }
      
      // Add placeholder or value with highlighting
      const value = formValues[fieldName];
      if (!value || value.trim() === '') {
        parts.push(
          <span 
            key={`field-${key++}`}
            className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded font-semibold"
            title={`Vul "${fieldTooltips[fieldName] || fieldName}" in`}
          >
            {`{${fieldName}}`}
          </span>
        );
      } else {
        parts.push(
          <span key={`field-${key++}`}>
            {value}
          </span>
        );
      }
      
      lastIndex = matchStart + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < template.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {template.substring(lastIndex)}
        </span>
      );
    }
    
    return <div className="whitespace-pre-wrap">{parts}</div>;
  };

  const hasUnfilledFields = useMemo(() => {
    return orderedFields.some(field => !formValues[field] || formValues[field].trim() === '');
  }, [orderedFields, formValues]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{factcode.factcode}</h2>
          <p className="text-muted-foreground">{factcode.description}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gegevens invoeren</CardTitle>
            <CardDescription>
              Vul de velden in om de reden van wetenschap te genereren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedFields.map((fieldName) => {
              const options = fieldOptions[fieldName];
              if (!options) {
                // Free text field if no options defined
                return renderField(fieldName, null);
              }
              return renderField(fieldName, options);
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gegenereerde RVW</CardTitle>
            <CardDescription>
              Vul alle velden in om de RVW te voltooien
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative min-h-[300px] rounded-md border border-border bg-background p-4">
              {renderGeneratedTextWithHighlights()}
            </div>
            {hasUnfilledFields && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded"></span>
                Let op: Geel gemarkeerde velden zijn nog niet ingevuld
              </div>
            )}
            <Button
              onClick={handleCopy}
              disabled={!generatedText}
              className="w-full"
              variant="secondary"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopieer naar klembord
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {factcode.template && (
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>De basisstructuur van de RVW</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {factcode.template}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}