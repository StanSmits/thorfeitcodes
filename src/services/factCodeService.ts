import { supabase } from '../config/supabase';
import { FactCode } from '../types/factCode';

class FactCodeService {
  async fetchFactCodes(): Promise<FactCode[]> {
    const { data, error } = await supabase
      .from('feitcodes')
      .select('id, factcode, description, template, field_options');

    if (error) throw error;

    return data.map(this.mapDatabaseToFactCode);
  }

  async addFactCode(factCode: FactCode): Promise<void> {
    const { error } = await supabase
      .from('feitcodes')
      .insert(this.mapFactCodeToDatabase(factCode));

    if (error) throw error;
  }

  async updateFactCode(id: string, updates: Partial<FactCode>): Promise<void> {
    const payload = this.mapFactCodeToDatabase(updates);
    const { error } = await supabase
      .from('feitcodes')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteFactCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('feitcodes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapDatabaseToFactCode(dbRecord: any): FactCode {
    return {
      id: dbRecord.id,
      code: dbRecord.factcode,
      description: dbRecord.description,
      template: dbRecord.template,
      field_options: dbRecord.field_options || {},
    };
  }

  private mapFactCodeToDatabase(factCode: Partial<FactCode>) {
    return {
      ...(factCode.code !== undefined ? { factcode: factCode.code } : {}),
      ...(factCode.description !== undefined ? { description: factCode.description } : {}),
      ...(factCode.template !== undefined ? { template: factCode.template } : {}),
      ...(factCode.field_options !== undefined ? { field_options: factCode.field_options } : {}),
    };
  }
}

export const factCodeService = new FactCodeService();