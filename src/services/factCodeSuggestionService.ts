import { supabase } from '../config/supabase';
import { FactCodeSuggestion } from '../types/factCode';

class FactCodeSuggestionService {
  async fetchSuggestions(): Promise<FactCodeSuggestion[]> {
    const { data, error } = await supabase
      .from('factcode_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async addSuggestion(suggestion: Omit<FactCodeSuggestion, 'id' | 'created_at' | 'status'>): Promise<void> {
    const { error } = await supabase
      .from('factcode_suggestions')
      .insert({ ...suggestion, status: 'pending' });
    if (error) throw error;
  }

  async updateSuggestionStatus(id: string, status: FactCodeSuggestion['status']): Promise<void> {
    const { error } = await supabase
      .from('factcode_suggestions')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSuggestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('factcode_suggestions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async updateSuggestion(id: string, updates: Partial<FactCodeSuggestion>): Promise<void> {
    const { error } = await supabase
      .from('factcode_suggestions')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  }
}

export const factCodeSuggestionService = new FactCodeSuggestionService();
