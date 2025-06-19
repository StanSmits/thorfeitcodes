import React, { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { FactCode } from '../types/factCode';
import { Button, Input, CheckboxGroup } from './ui';
import { useToast } from '../hooks/useToast';
import { extractTemplateFields, replaceTemplateFields, getDefaultFieldOptions } from '../utils/templateUtils';

interface TemplateDisplayProps {
  factCode: FactCode;
}

const TemplateDisplay: React.FC<TemplateDisplayProps> = ({ factCode }) => {
  const [copied, setCopied] = useState(false);
  const templateFields = extractTemplateFields(factCode.template);
  const fieldOptions = factCode.field_options || getDefaultFieldOptions(factCode.template);
  
  const [editableFields, setEditableFields] = useState<Record<string, string>>(
    Object.fromEntries(templateFields.map(field => [field, '']))
  );
  const [isHeld, setIsHeld] = useState(false);
  const [reason, setReason] = useState('');
  const { showSuccess, showError } = useToast();

  const getDisplayText = (): string => {
    const templateText = replaceTemplateFields(factCode.template, editableFields);
    const heldText = isHeld
      ? `Ik heb de persoon staande gehouden inzake feitcode ${factCode.code}.`
      : `Ik kon de persoon niet staande houden vanwege ${reason || '[reden]'}.`;

    return `${templateText}\n\n${heldText}`;
  };

  const handleFieldChange = (name: string, value: string) => {
    setEditableFields(prev => ({ ...prev, [name]: value }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getDisplayText());
      setCopied(true);
      showSuccess('Tekst gekopieerd naar klembord!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError('Kopiëren mislukt. Probeer het opnieuw.');
      console.error('Copy error:', error);
    }
  };

  const renderField = (field: string) => {
    const fieldConfig = fieldOptions[field];
    
    if (fieldConfig?.type === 'checkbox' && fieldConfig.options) {
      return (
        <CheckboxGroup
          key={field}
          label={field}
          options={fieldConfig.options}
          value={editableFields[field]}
          onChange={(value) => handleFieldChange(field, value)}
          name={field}
        />
      );
    }

    return (
      <Input
        key={field}
        label={field}
        value={editableFields[field]}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        placeholder={`Vul ${field.toLowerCase()} in...`}
      />
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <div className="mb-4 pb-3 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{factCode.code}</h3>
            <p className="text-gray-600">{factCode.description}</p>
          </div>
          <Button
            onClick={handleCopy}
            variant="secondary"
            icon={copied ? CheckCircle : Copy}
            aria-label="Kopieer tekst"
          >
            {copied ? 'Gekopieerd' : 'Kopieer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Vul de ontbrekende gegevens in:
            </h4>
            <div className="space-y-4">
              {templateFields.map(renderField)}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isHeld}
                onChange={(e) => {
                  setIsHeld(e.target.checked);
                  if (e.target.checked) setReason('');
                }}
                className="form-checkbox text-[#ec0000] focus:ring-[#ec0000]"
              />
              <span className="text-sm font-medium text-gray-700">
                Persoon staande gehouden
              </span>
            </label>

            {!isHeld && (
              <Input
                label="Reden waarom persoon niet staande is gehouden"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Resultaat:</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="text-gray-800 whitespace-pre-line">
              {getDisplayText().split(/\[([^\]]+)\]/).map((part, index) => (
                index % 2 === 1 ? (
                  <span key={index} className="bg-yellow-100 text-yellow-800 px-1 rounded">
                    [{part}]
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4">
        <Button
          onClick={handleCopy}
          icon={copied ? CheckCircle : Copy}
          className="shadow-lg"
          aria-label="Kopieer tekst (sticky)"
        >
          {copied ? 'Gekopieerd' : 'Kopieer tekst'}
        </Button>
      </div>
    </div>
  );
};

export default TemplateDisplay;