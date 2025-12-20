import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'feitcode-search-history';
const MAX_HISTORY = 5;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setHistory((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((term: string) => {
    setHistory((prev) => {
      const updated = prev.filter((t) => t !== term);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
