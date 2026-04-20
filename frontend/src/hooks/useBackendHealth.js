import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client';

/**
 * Poll /health every 20s. Returns { online, lastChecked, service }.
 * UI can use this to display a "Connected to backend" vs "Mock mode" badge.
 */
export default function useBackendHealth(intervalMs = 20000) {
  const [state, setState] = useState({
    online: null, // null = not yet checked
    lastChecked: null,
    service: null,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const tick = async () => {
      const result = await checkHealth(controller.signal);
      if (cancelled) return;
      setState({
        online: Boolean(result),
        lastChecked: new Date(),
        service: result?.service ?? null,
      });
    };

    tick();
    const id = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [intervalMs]);

  return state;
}
