import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_RELAY_CONFIG, hasRelay } from '@/config/relayConfig';
import {
  getRelayState,
  RelayResult,
  RelayTransport,
  setRelayState,
} from '@/lib/relay';
import { useStore } from '@/store/useStore';
import type { RelayTableId } from '@/types';

export type RelayUiState = 'unknown' | 'loading' | 'on' | 'off' | 'error';

export function useTableRelay(tableId: string) {
  const config = useStore(
    (store) => store.relays[tableId as RelayTableId] ?? DEFAULT_RELAY_CONFIG,
  );
  const supported = hasRelay(config);
  const [state, setState] = useState<RelayUiState>('unknown');
  const [transport, setTransport] = useState<RelayTransport | null>(null);
  const requestId = useRef(0);

  const applyResult = useCallback((result: RelayResult) => {
    setState(result.on ? 'on' : 'off');
    setTransport(result.transport);
  }, []);

  const refresh = useCallback(async () => {
    if (!supported) return null;
    const currentRequest = ++requestId.current;
    try {
      const result = await getRelayState(tableId, config);
      if (currentRequest === requestId.current) applyResult(result);
      return result;
    } catch (error) {
      if (currentRequest === requestId.current) {
        setState((previous) => (previous === 'unknown' ? 'error' : previous));
      }
      throw error;
    }
  }, [applyResult, config, supported, tableId]);

  const setLight = useCallback(
    async (on: boolean) => {
      if (!supported) throw new Error('Для этого стола реле не настроено');
      const currentRequest = ++requestId.current;
      setState('loading');
      try {
        const result = await setRelayState(tableId, config, on);
        if (currentRequest === requestId.current) applyResult(result);
        return result;
      } catch (error) {
        if (currentRequest === requestId.current) setState('error');
        throw error;
      }
    },
    [applyResult, config, supported, tableId],
  );

  useEffect(() => {
    requestId.current += 1;
    setState('unknown');
    setTransport(null);
    if (!supported) return;

    void refresh().catch(() => undefined);
    const interval = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 10_000);

    return () => {
      requestId.current += 1;
      clearInterval(interval);
    };
  }, [refresh, supported]);

  return { supported, state, transport, refresh, setLight };
}
