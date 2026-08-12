import { useEffect, useRef } from 'react';

/**
 * Runs `fetcher` immediately and then on a fixed interval, guarded against
 * overlapping runs. Pauses when the document is hidden (saves battery / server
 * load when the tab is in the background).
 */
export function usePolling(fetcher: () => void | Promise<void>, intervalMs: number) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let active = false;

    const tick = async () => {
      if (active || document.hidden) return;
      active = true;
      try {
        await fetcherRef.current();
      } finally {
        active = false;
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    tick();
    start();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        tick();
        start();
      }
    });

    return () => {
      stop();
      document.removeEventListener('visibilitychange', () => {});
    };
  }, [intervalMs]);
}
