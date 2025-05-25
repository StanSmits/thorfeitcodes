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