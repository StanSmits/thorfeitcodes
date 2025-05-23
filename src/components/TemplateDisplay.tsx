import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { FactCode } from '../types/factCode';
import EditableField from './EditableField';

interface TemplateDisplayProps {
  factCode: FactCode;
}

const TemplateDisplay: React.FC<TemplateDisplayProps> = ({ factCode }) => {
  const [copied, setCopied] = useState(false);
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [displayText, setDisplayText] = useState('');
  const templateRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fieldRegex = /\{([^}]+)\}/g;
    const fields: Record<string, string> = {};
    let match;
    
    while ((match = fieldRegex.exec(factCode.template)) !== null) {
      fields[match[1]] = '';
    }
    
    setEditableFields(fields);
    updateDisplayText(fields);
  }, [factCode]);
  
  const updateDisplayText = (fields: Record<string, string>) => {
    let text = factCode.template;
    Object.keys(fields).forEach(key => {
      const value = fields[key] || `[${key}]`;
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    setDisplayText(text);
  };
  
  const handleFieldChange = (name: string, value: string) => {
    const newFields = { ...editableFields, [name]: value };
    setEditableFields(newFields);
    updateDisplayText(newFields);
  };
  
  const handleCopy = () => {
    if (navigator.clipboard && displayText) {
      navigator.clipboard.writeText(displayText)
        .then(() => {
          setCopied(true);
          toast.success('Tekst gekopieerd naar klembord!');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast.error('Kopiëren mislukt. Probeer het opnieuw.');
        });
    }
  };

  return (
    <>
      <div className="template-container active" ref={templateRef}>
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{factCode.code}</h3>
              <p className="text-gray-600">{factCode.description}</p>
            </div>
            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center space-x-1"
              aria-label="Kopieer tekst"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Gekopieerd</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kopieer</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-fields">
            <h4 className="text-md font-medium text-gray-700 mb-3">Vul de ontbrekende gegevens in:</h4>
            <div className="space-y-3">
              {Object.keys(editableFields).map((field) => (
                <div key={field} className="form-control">
                  <label className="text-sm font-medium text-gray-600 mb-1 block">
                    {field}:
                  </label>
                  <EditableField
                    name={field}
                    value={editableFields[field]}
                    onChange={(value) => handleFieldChange(field, value)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="preview">
            <h4 className="text-md font-medium text-gray-700 mb-3">Resultaat:</h4>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="text-gray-800 whitespace-pre-line">
                {displayText.split(/\[([^\]]+)\]/).map((part, index) => {
                  if (index % 2 === 1) {
                    return (
                      <span key={index} className="bg-yellow-100 text-yellow-800 px-1 rounded">
                        [{part}]
                      </span>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4">
        <button
          onClick={handleCopy}
          className="btn-primary flex items-center space-x-2 shadow-lg"
          aria-label="Kopieer tekst (sticky)"
        >
          {copied ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Gekopieerd</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Kopieer tekst</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default TemplateDisplay;