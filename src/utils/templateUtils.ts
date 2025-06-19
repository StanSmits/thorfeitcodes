import { FieldOptions } from '../types/factCode';

export const extractTemplateFields = (template: string): string[] => {
  const fieldRegex = /\{([^}]+)\}/g;
  const fields = new Set<string>();
  let match;

  while ((match = fieldRegex.exec(template)) !== null) {
    fields.add(match[1]);
  }

  return Array.from(fields);
};

export const replaceTemplateFields = (
  template: string,
  fields: Record<string, string>
): string => {
  return template.replace(/\{([^}]+)\}/g, (match, field) => {
    return fields[field] || `[${field}]`;
  });
};

export function highlightTemplateFields(template: string) {
  // Split on {field} and keep the field names
  const regex = /\{([^}]+)\}/g;
  const parts: (string | { field: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template))) {
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }
    parts.push({ field: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }
  return parts;
}

// Parse checkbox options from field names like "zijn/haar" or "linker-/rechterhand"
export const parseCheckboxOptions = (fieldName: string): string[] => {
  // Check if field contains options separated by /
  if (fieldName.includes('/')) {
    return fieldName.split('/').map(option => option.trim());
  }
  return [];
};

// Check if a field should be a checkbox based on its content
export const shouldBeCheckbox = (fieldName: string): boolean => {
  const options = parseCheckboxOptions(fieldName);
  return options.length >= 2 && options.length <= 5; // Reasonable range for checkboxes
};

// Get default field options for a template
export const getDefaultFieldOptions = (template: string): FieldOptions => {
  const fields = extractTemplateFields(template);
  const fieldOptions: FieldOptions = {};

  fields.forEach(field => {
    if (shouldBeCheckbox(field)) {
      fieldOptions[field] = {
        type: 'checkbox',
        options: parseCheckboxOptions(field)
      };
    } else {
      fieldOptions[field] = {
        type: 'text'
      };
    }
  });

  return fieldOptions;
};