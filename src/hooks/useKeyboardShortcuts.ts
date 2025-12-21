import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseKeyboardShortcutsOptions {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onSelectFirst?: () => void;
  onBack?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+K or Cmd+K: Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      
      if (location.pathname !== '/') {
        navigate('/');
      }
      
      // Focus the search input after a small delay to allow navigation
      setTimeout(() => {
        options.searchInputRef?.current?.focus();
      }, 100);
    }

    // Escape: Go back
    if (event.key === 'Escape') {
      // Don't trigger if in an input or dialog
      const activeElement = document.activeElement;
      const isInDialog = activeElement?.closest('[role="dialog"]');
      
      if (!isInDialog) {
        if (options.onBack) {
          options.onBack();
        } else if (window.history.length > 1) {
          navigate(-1);
        }
      }
    }

    // Enter: Select first result (only when not in input)
    if (event.key === 'Enter') {
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT' || 
                        activeElement?.tagName === 'TEXTAREA';
      
      if (!isInInput && options.onSelectFirst) {
        options.onSelectFirst();
      }
    }
  }, [navigate, location.pathname, options]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Global hook for Ctrl+K shortcut only (used in Layout)
export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Navigate to search and focus
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        
        if (location.pathname !== '/') {
          navigate('/');
        }
        
        // Dispatch custom event for Search page to handle focus
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('focus-search'));
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);
}
