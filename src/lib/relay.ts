import { normalizeRelayUrl } from '@/config/relayConfig';
import { getRelaySecrets } from '@/lib/relaySecrets';
import type { RelayConfig } from '@/types';

export type RelayTransport = 'cloud';

export interface RelayResult {
  on: boolean;
  transport: RelayTransport;
}

class RelayRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

async function requestCloudRelay(
  baseUrl: string,
  token: string,
  tableId: string,
  config: RelayConfig,
  on?: boolean,
): Promise<RelayResult> {
  if (!baseUrl) throw new RelayRequestError('Адрес управления реле не настроен', true);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const isControl = typeof on === 'boolean';
    const path = isControl ? '/api/relay/control' : '/api/relay/status';
    const device = {
      deviceId: config.deviceId.trim(),
      dpCode: config.dpCode.trim(),
      region: config.region,
    };
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        tableId,
        device,
        ...(isControl ? { on } : {}),
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw new RelayRequestError(
        payload?.error || `Сервер реле ответил HTTP ${response.status}`,
        response.status >= 500 || response.status === 404,
      );
    }
    return { on: Boolean(payload.on), transport: 'cloud' };
  } catch (error) {
    if (error instanceof RelayRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RelayRequestError('Облачный сервер реле не отвечает', true);
    }
    throw new RelayRequestError(
      error instanceof Error ? error.message : 'Не удалось связаться с реле',
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function confirmCommandResult(
  tableId: string,
  config: RelayConfig,
  token: string,
  expected: boolean,
): Promise<RelayResult | null> {
  const cloudUrl = normalizeRelayUrl(config.cloudUrl);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await pause(750);
    try {
      const result = await requestCloudRelay(cloudUrl, token, tableId, config);
      if (result.on === expected) return result;
    } catch {
      // Команда могла быть принята, пока приложение потеряло ответ. Проверяем ещё раз.
    }
  }
  return null;
}

async function requestRelay(
  tableId: string,
  config: RelayConfig,
  on?: boolean,
): Promise<RelayResult> {
  const secrets = await getRelaySecrets();
  const cloudUrl = normalizeRelayUrl(config.cloudUrl);
  if (config.mode !== 'cloud') {
    throw new RelayRequestError('Управление реле выключено', false);
  }

  try {
    return await requestCloudRelay(
      cloudUrl,
      secrets.apiToken,
      tableId,
      config,
      on,
    );
  } catch (error) {
    if (typeof on === 'boolean') {
      const confirmed = await confirmCommandResult(tableId, config, secrets.apiToken, on);
      if (confirmed) return confirmed;
    }
    throw error;
  }
}

export const getRelayState = (tableId: string, config: RelayConfig) =>
  requestRelay(tableId, config);

export const setRelayState = (tableId: string, config: RelayConfig, on: boolean) =>
  requestRelay(tableId, config, on);
