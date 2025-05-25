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