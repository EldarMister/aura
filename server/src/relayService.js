import { getCloudRelayState, isTuyaCloudConfigured, setCloudRelayState } from './tuyaCloud.js';

const TABLE_IDS = new Set(['table-1', 'table-2']);
const REGIONS = new Set(['eu', 'eu-west', 'us', 'us-east', 'cn', 'in', 'sg']);
const lockDeviceConfig = process.env.TUYA_LOCK_DEVICE_CONFIG === 'true';

const ENV_TABLE_CONFIG = {
  'table-1': {
    deviceId: process.env.TUYA_TABLE_1_DEVICE_ID?.trim(),
    dpCode: process.env.TUYA_TABLE_1_DP_CODE?.trim() || 'switch_1',
  },
  'table-2': {
    deviceId: process.env.TUYA_TABLE_2_DEVICE_ID?.trim(),
    dpCode: process.env.TUYA_TABLE_2_DP_CODE?.trim() || 'switch_1',
  },
};

function cleanString(value, maxLength = 100) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getConfig(tableId, provided = {}) {
  if (!TABLE_IDS.has(tableId)) throw new Error(`Реле для ${tableId} не поддерживается`);

  const saved = ENV_TABLE_CONFIG[tableId];
  const incoming =
    !lockDeviceConfig && provided && typeof provided === 'object' ? provided : {};
  const config = {
    deviceId: cleanString(incoming.deviceId, 80) || saved.deviceId,
    dpCode: cleanString(incoming.dpCode, 64) || saved.dpCode,
    region: cleanString(incoming.region, 8).toLowerCase() || 'eu',
  };

  if (!config.deviceId || !/^[a-zA-Z0-9_-]{4,80}$/.test(config.deviceId)) {
    throw new Error('Некорректный Device ID реле');
  }
  if (!config.dpCode || !/^[a-zA-Z0-9_]{1,64}$/.test(config.dpCode)) {
    throw new Error('Некорректный код DP реле');
  }
  if (!REGIONS.has(config.region)) throw new Error('Неизвестный регион Tuya');
  return config;
}

export function getRelayCapabilities() {
  return {
    cloud: isTuyaCloudConfigured(),
    appConfigurable: !lockDeviceConfig,
    tables: [...TABLE_IDS],
  };
}

export async function getRelayState(tableId, providedConfig) {
  if (!isTuyaCloudConfigured()) throw new Error('Tuya Cloud не настроен на сервере');
  const config = getConfig(tableId, providedConfig);
  return {
    on: await getCloudRelayState(config.deviceId, config.dpCode, config.region),
    transport: 'cloud',
  };
}

export async function setRelayState(tableId, on, providedConfig) {
  if (!isTuyaCloudConfigured()) throw new Error('Tuya Cloud не настроен на сервере');
  const config = getConfig(tableId, providedConfig);
  return {
    on: await setCloudRelayState(config.deviceId, config.dpCode, config.region, on),
    transport: 'cloud',
  };
}
