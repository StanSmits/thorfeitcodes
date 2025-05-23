import {
    fetchFactCodesFromApi,
    addFactCodeToApi,
    updateFactCodeInApi,
    deleteFactCodeFromApi,
  } from '../api/factCodesApi';
  import { FactCode } from '../types/factCode';
  
  export const fetchFactCodes = async (): Promise<FactCode[]> => {
    try {
      return await fetchFactCodesFromApi();
    } catch (error) {
      console.error('Error fetching fact codes:', error);
      throw error;
    }
  };
  
  export const addFactCode = async (factCode: FactCode): Promise<void> => {
    try {
      await addFactCodeToApi(factCode);
    } catch (error) {
      console.error('Error adding fact code:', error);
      throw error;
    }
  };
  
  export const updateFactCode = async (id: string, updates: Partial<FactCode>): Promise<void> => {
    try {
      await updateFactCodeInApi(id, updates);
    } catch (error) {
      console.error('Error updating fact code:', error);
      throw error;
    }
  };
  
  export const deleteFactCode = async (id: string): Promise<void> => {
    try {
      await deleteFactCodeFromApi(id);
    } catch (error) {
      console.error('Error deleting fact code:', error);
      throw error;
    }
  };