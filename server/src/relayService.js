import { getCloudRelayState, isTuyaCloudConfigured, setCloudRelayState } from './tuyaCloud.js';

const ENV_TABLE_CONFIG = {
  'table-1': {
    deviceId: process.env.TUYA_TABLE_1_DEVICE_ID?.trim(),
    dpCode: process.env.TUYA_TABLE_1_DP_CODE?.trim() || 'switch_1',
    dpId: Number(process.env.TUYA_TABLE_1_DP_ID || 1),
    localKey: process.env.TUYA_TABLE_1_LOCAL_KEY?.trim(),
    localIp: process.env.TUYA_TABLE_1_LOCAL_IP?.trim(),
    version: process.env.TUYA_TABLE_1_VERSION?.trim() || '3.3',
    region: process.env.TUYA_REGION?.trim().toLowerCase() || 'eu',
  },
};

const lockDeviceConfig = process.env.TUYA_LOCK_DEVICE_CONFIG === 'true';
const REGIONS = new Set(['eu', 'eu-west', 'us', 'us-east', 'cn', 'in', 'sg']);
const VERSIONS = new Set(['3.3', '3.4', '3.5']);
let localQueue = Promise.resolve();

function cleanString(value, maxLength = 100) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getConfig(tableId, provided = {}) {
  const saved = ENV_TABLE_CONFIG[tableId];
  if (!saved) throw new Error(`Реле для ${tableId} не поддерживается`);

  const incoming =
    !lockDeviceConfig && provided && typeof provided === 'object' ? provided : {};
  const config = {
    deviceId: cleanString(incoming.deviceId, 80) || saved.deviceId,
    dpCode: cleanString(incoming.dpCode, 64) || saved.dpCode,
    dpId: Number(incoming.dpId ?? saved.dpId),
    localKey: cleanString(incoming.localKey, 32) || saved.localKey,
    localIp: cleanString(incoming.localIp, 255) || saved.localIp,
    version: cleanString(incoming.version, 8) || saved.version,
    region: cleanString(incoming.region, 8).toLowerCase() || saved.region,
  };

  if (!config.deviceId || !/^[a-zA-Z0-9_-]{4,80}$/.test(config.deviceId)) {
    throw new Error('Некорректный Device ID реле');
  }
  if (!config.dpCode || !/^[a-zA-Z0-9_]{1,64}$/.test(config.dpCode)) {
    throw new Error('Некорректный код DP реле');
  }
  if (!Number.isInteger(config.dpId) || config.dpId < 1 || config.dpId > 999) {
    throw new Error('DP ID должен быть числом от 1 до 999');
  }
  if (!VERSIONS.has(config.version)) {
    throw new Error('Версия Tuya должна быть 3.3, 3.4 или 3.5');
  }
  if (!REGIONS.has(config.region)) throw new Error('Неизвестный регион Tuya');
  return config;
}

function hasLocalConfig(config) {
  return Boolean(config.deviceId && config.localKey?.length === 16);
}

async function withLocalDevice(config, action) {
  if (!hasLocalConfig(config)) throw new Error('Локальное управление Tuya не настроено');

  const run = async () => {
    const { default: TuyAPI } = await import('tuyapi');
    const device = new TuyAPI({
      id: config.deviceId,
      key: config.localKey,
      ...(config.localIp ? { ip: config.localIp } : {}),
      version: config.version,
      issueGetOnConnect: false,
    });

    try {
      if (!config.localIp) await device.find();
      await device.connect();
      return await action(device);
    } finally {
      device.disconnect();
    }
  };

  const next = localQueue.then(run, run);
  localQueue = next.catch(() => undefined);
  return next;
}

async function getLocalState(config) {
  return withLocalDevice(config, async (device) => {
    const value = await device.get({ dps: config.dpId });
    if (typeof value !== 'boolean') {
      throw new Error(`Локальный DP ${config.dpId} не вернул логический статус`);
    }
    return value;
  });
}

async function setLocalState(config, on) {
  return withLocalDevice(config, async (device) => {
    await device.set({ dps: config.dpId, set: on });
    return on;
  });
}

export function getRelayCapabilities() {
  const config = ENV_TABLE_CONFIG['table-1'];
  return {
    cloud: Boolean(config.deviceId && isTuyaCloudConfigured()),
    local: hasLocalConfig(config),
    appConfigurable: !lockDeviceConfig,
  };
}

export async function getRelayState(tableId, transport = 'auto', providedConfig) {
  const config = getConfig(tableId, providedConfig);

  if (transport === 'local') {
    return { on: await getLocalState(config), transport: 'local' };
  }
  if (transport === 'cloud') {
    if (!isTuyaCloudConfigured()) throw new Error('Tuya Cloud не настроен на сервере');
    return {
      on: await getCloudRelayState(config.deviceId, config.dpCode, config.region),
      transport: 'cloud',
    };
  }

  if (hasLocalConfig(config)) {
    try {
      return { on: await getLocalState(config), transport: 'local' };
    } catch {
      // Локальное реле может быть вне этой сети — используем облако.
    }
  }
  if (!isTuyaCloudConfigured()) throw new Error('Нет доступного канала управления Tuya');
  return {
    on: await getCloudRelayState(config.deviceId, config.dpCode, config.region),
    transport: 'cloud',
  };
}

export async function setRelayState(tableId, on, transport = 'auto', providedConfig) {
  const config = getConfig(tableId, providedConfig);

  if (transport === 'local') {
    return { on: await setLocalState(config, on), transport: 'local' };
  }
  if (transport === 'cloud') {
    if (!isTuyaCloudConfigured()) throw new Error('Tuya Cloud не настроен на сервере');
    return {
      on: await setCloudRelayState(config.deviceId, config.dpCode, config.region, on),
      transport: 'cloud',
    };
  }

  if (hasLocalConfig(config)) {
    try {
      return { on: await setLocalState(config, on), transport: 'local' };
    } catch {
      // При сбое LAN команда повторяется через Tuya Cloud.
    }
  }
  if (!isTuyaCloudConfigured()) throw new Error('Нет доступного канала управления Tuya');
  return {
    on: await setCloudRelayState(config.deviceId, config.dpCode, config.region, on),
    transport: 'cloud',
  };
}
