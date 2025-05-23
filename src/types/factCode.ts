export interface FactCode {
  id?: string;
  created_at?: string;
  factcode?: string; // Voor de database
  code: string; // Voor de frontend
  description: string;
  template: string;
}