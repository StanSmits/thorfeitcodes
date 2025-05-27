export interface FactCode {
  id?: string;
  created_at?: string;
  factcode?: string; // Voor de database
  code: string; // Voor de frontend
  description: string;
  template: string;
}

export interface FactCodeSuggestion {
  id?: string;
  suggested_code: string;
  description: string;
  template: string;
  created_at?: string;
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected';
}