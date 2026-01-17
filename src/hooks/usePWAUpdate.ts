import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateServiceWorker = useCallback(async () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload to get the new version
    window.location.reload();
  }, [registration]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers not supported');
      return;
    }

    const handleControllerChange = () => {
      console.log('[PWA] Controller changed, reloading...');
      window.location.reload();
    };

    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);
          
          // Check if there's a waiting worker
          if (reg.waiting) {
            console.log('[PWA] Update available (waiting worker found)');
            setNeedRefresh(true);
          }

          // Listen for new waiting workers
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New content available');
                  setNeedRefresh(true);
                }
              });
            }
          });

          // Periodically check for updates (every 60 seconds)
          const interval = setInterval(() => {
            console.log('[PWA] Checking for updates...');
            reg.update().catch(console.error);
          }, 60 * 1000);

          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('[PWA] Error checking for updates:', error);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast('Nieuwe versie beschikbaar!', {
        description: 'Klik om te updaten naar de nieuwste versie.',
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker();
          },
        },
        duration: Infinity,
        id: 'pwa-update',
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
}
