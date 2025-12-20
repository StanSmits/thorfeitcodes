import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'feitcode-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = useCallback((factcodeId: string) => {
    setFavorites((prev) => {
      const isFavorite = prev.includes(factcodeId);
      const updated = isFavorite
        ? prev.filter((id) => id !== factcodeId)
        : [...prev, factcodeId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((factcodeId: string) => {
    return favorites.includes(factcodeId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
