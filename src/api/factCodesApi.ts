import { supabase } from '../supabaseClient';
import { FactCode } from '../types/factCode';

export const fetchFactCodesFromApi = async (): Promise<FactCode[]> => {
  const { data, error } = await supabase
    .from('feitcodes')
    .select('id, factcode, description, template, field_options');

  if (error) throw new Error(error.message);

  // Map 'factcode' naar 'code' voor de frontend
  return data.map(item => ({
    id: item.id,
    code: item.factcode, // Map 'factcode' naar 'code'
    description: item.description,
    template: item.template,
  })) as FactCode[];
};

export const addFactCodeToApi = async (factCode: FactCode): Promise<void> => {
  const { error } = await supabase.from('feitcodes').insert({
    factcode: factCode.code, // Map 'code' naar 'factcode'
    description: factCode.description,
    template: factCode.template,
  });

  if (error) throw new Error(error.message);
};

export const updateFactCodeInApi = async (id: string, updates: Partial<FactCode>): Promise<void> => {
  const { error } = await supabase
    .from('feitcodes')
    .update({
      factcode: updates.code, // Map 'code' naar 'factcode'
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