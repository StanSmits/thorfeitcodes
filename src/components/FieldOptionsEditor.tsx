import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Button, Input } from './ui';
import { FieldOptions } from '../types/factCode';
import { extractTemplateFields, getDefaultFieldOptions } from '../utils/templateUtils';

interface FieldOptionsEditorProps {
  template: string;
  fieldOptions: FieldOptions;
  onChange: (fieldOptions: FieldOptions) => void;
}

const FieldOptionsEditor: React.FC<FieldOptionsEditorProps> = ({
  template,
  fieldOptions,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const templateFields = extractTemplateFields(template);
  const currentOptions = { ...getDefaultFieldOptions(template), ...fieldOptions };

  const handleFieldTypeChange = (fieldName: string, type: 'text' | 'checkbox') => {
    const newOptions = { ...currentOptions };
    newOptions[fieldName] = {
      type,
      options: type === 'checkbox' ? ['Optie 1', 'Optie 2'] : undefined
    };
    onChange(newOptions);
  };

  const handleOptionChange = (fieldName: string, optionIndex: number, value: string) => {
    const newOptions = { ...currentOptions };
    if (newOptions[fieldName]?.options) {
      newOptions[fieldName].options![optionIndex] = value;
      onChange(newOptions);
    }
  };

  const addOption = (fieldName: string) => {
    const newOptions = { ...currentOptions };
    if (newOptions[fieldName]?.options) {
      newOptions[fieldName].options!.push('Nieuwe optie');
      onChange(newOptions);
    }
  };

  const removeOption = (fieldName: string, optionIndex: number) => {
    const newOptions = { ...currentOptions };
    if (newOptions[fieldName]?.options && newOptions[fieldName].options!.length > 2) {
      newOptions[fieldName].options!.splice(optionIndex, 1);
      onChange(newOptions);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        icon={Settings}
        className="mb-4"
      >
        Veld opties configureren
      </Button>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-medium text-gray-700">Veld Configuratie</h4>
        <Button
          variant="secondary"
          onClick={() => setIsOpen(false)}
        >
          Sluiten
        </Button>
      </div>

      <div className="space-y-4">
        {templateFields.map(field => (
          <div key={field} className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{field}</span>
              <select
                value={currentOptions[field]?.type || 'text'}
                onChange={(e) => handleFieldTypeChange(field, e.target.value as 'text' | 'checkbox')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="text">Tekstveld</option>
                <option value="checkbox">Keuzemenu</option>
              </select>
            </div>

            {currentOptions[field]?.type === 'checkbox' && (
              <div className="space-y-2">
                <span className="text-xs text-gray-600">Opties:</span>
                {currentOptions[field]?.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(field, index, e.target.value)}
                      className="text-sm"
                    />
                    {currentOptions[field]?.options && currentOptions[field].options!.length > 2 && (
                      <Button
                        variant="secondary"
                        onClick={() => removeOption(field, index)}
                        icon={Trash2}
                        className="p-1"
                        aria-label="Verwijder optie"
                      />
                    )}
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={() => addOption(field)}
                  icon={Plus}
                  className="text-sm"
                >
                  Optie toevoegen
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FieldOptionsEditor;