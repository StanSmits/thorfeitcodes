import { supabase } from '../config/supabase';
import { FactCode } from '../types/factCode';

class FactCodeService {
  async fetchFactCodes(): Promise<FactCode[]> {
    const { data, error } = await supabase
      .from('feitcodes')
      .select('id, factcode, description, template');

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
    const { error } = await supabase
      .from('feitcodes')
      .update(this.mapFactCodeToDatabase(updates))
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
    };
  }

  private mapFactCodeToDatabase(factCode: Partial<FactCode>) {
    return {
      ...(factCode.code && { factcode: factCode.code }),
      ...(factCode.description && { description: factCode.description }),
      ...(factCode.template && { template: factCode.template }),
    };
  }
}

export const factCodeService = new FactCodeService();