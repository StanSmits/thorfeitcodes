import { supabase } from '../supabaseClient';
import { FactCode } from '../types/factCode';

export const fetchFactCodesFromApi = async (): Promise<FactCode[]> => {
  const { data, error } = await supabase
    .from('feitcodes')
    .select('id, factcode, description, template');

  if (error) throw new Error(error.message);

  return data as FactCode[];
};

export const addFactCodeToApi = async (factCode: FactCode): Promise<void> => {
  const { error } = await supabase.from('feitcodes').insert({
    factcode: factCode.factcode,
    description: factCode.description,
    template: factCode.template,
  });

  if (error) throw new Error(error.message);
};

export const updateFactCodeInApi = async (id: string, updates: Partial<FactCode>): Promise<void> => {
  const { error } = await supabase
    .from('feitcodes')
    .update({
      factcode: updates.factcode,
      description: updates.description,
      template: updates.template,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const deleteFactCodeFromApi = async (id: string): Promise<void> => {
  const { error } = await supabase.from('feitcodes').delete().eq('id', id);
  if (error) throw new Error(error.message);
};