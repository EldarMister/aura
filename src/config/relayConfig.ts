import { CLOUD_SYNC_URL } from '@/config/syncConfig';
import type { RelayConfig, RelayConfigs } from '@/types';

const trimSlash = (value: string) => value.trim().replace(/\/+$/, '');

export const RELAY_ENV_API_TOKEN =
  process.env.EXPO_PUBLIC_RELAY_API_TOKEN?.trim() ?? '';

export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  mode: 'off',
  deviceId: '',
  region: 'eu',
  dpCode: 'switch_1',
  cloudUrl: trimSlash(process.env.EXPO_PUBLIC_RELAY_CLOUD_URL ?? CLOUD_SYNC_URL),
};

export const DEFAULT_RELAY_CONFIGS: RelayConfigs = {
  'table-1': { ...DEFAULT_RELAY_CONFIG },
  'table-2': { ...DEFAULT_RELAY_CONFIG },
};

export const normalizeRelayUrl = trimSlash;

export const hasRelay = (config: RelayConfig) =>
  config.mode === 'cloud' && config.deviceId.trim().length > 0;
