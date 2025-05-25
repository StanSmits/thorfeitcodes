import { useState, useCallback } from 'react';
import { FactCode } from '../types/factCode';
import { factCodeService } from '../services/factCodeService';
import { useToast } from './useToast';

export const useFactCodes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [factCodes, setFactCodes] = useState<FactCode[]>([]);
  const { showError, showSuccess } = useToast();

  const fetchFactCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      const codes = await factCodeService.fetchFactCodes();
      setFactCodes(codes);
    } catch (error) {
      showError('Failed to fetch fact codes');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const addFactCode = useCallback(async (factCode: FactCode) => {
    try {
      await factCodeService.addFactCode(factCode);
      showSuccess('Fact code added successfully');
      await fetchFactCodes();
    } catch (error) {
      showError('Failed to add fact code');
      console.error(error);
    }
  }, [fetchFactCodes, showSuccess, showError]);

  const updateFactCode = useCallback(async (id: string, updates: Partial<FactCode>) => {
    try {
      await factCodeService.updateFactCode(id, updates);
      showSuccess('Fact code updated successfully');
      await fetchFactCodes();
    } catch (error) {
      showError('Failed to update fact code');
      console.error(error);
    }
  }, [fetchFactCodes, showSuccess, showError]);

  const deleteFactCode = useCallback(async (id: string) => {
    try {
      await factCodeService.deleteFactCode(id);
      showSuccess('Fact code deleted successfully');
      await fetchFactCodes();
    } catch (error) {
      showError('Failed to delete fact code');
      console.error(error);
    }
  }, [fetchFactCodes, showSuccess, showError]);

  return {
    isLoading,
    factCodes,
    fetchFactCodes,
    addFactCode,
    updateFactCode,
    deleteFactCode,
  };
};