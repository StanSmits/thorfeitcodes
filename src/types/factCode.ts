export interface FactCode {
  id?: string;
  created_at?: string;
  factcode?: string; // Voor de database
  code: string; // Voor de frontend
  description: string;
  template: string;
  field_options?: FieldOptions; // New field for checkbox options
}

export interface FactCodeSuggestion {
  id?: string;
  suggested_code: string;
  description: string;
  template: string;
  created_at?: string;
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  field_options?: FieldOptions;
}

export interface FieldOptions {
  [fieldName: string]: {
    type: 'text' | 'checkbox';
    options?: string[]; // For checkbox type
  };
}

export interface CheckboxField {
  field: string;
  options: string[];
}