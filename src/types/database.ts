export interface Database {
  public: {
    Tables: {
      feitcodes: {
        Row: {
          id: string;
          factcode: string;
          description: string;
          template: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          factcode: string;
          description: string;
          template: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          factcode?: string;
          description?: string;
          template?: string;
          created_at?: string;
        };
      };
    };
  };
}