import { createHash, createHmac } from 'node:crypto';

const REGION_ENDPOINTS = {
  cn: 'https://openapi.tuyacn.com',
  eu: 'https://openapi.tuyaeu.com',
  'eu-west': 'https://openapi-weaz.tuyaeu.com',
  in: 'https://openapi.tuyain.com',
  sg: 'https://openapi-sg.iotbing.com',
  us: 'https://openapi.tuyaus.com',
  'us-east': 'https://openapi-ueaz.tuyaus.com',
};

const clientId = process.env.TUYA_ACCESS_ID?.trim();
const clientSecret = process.env.TUYA_ACCESS_SECRET?.trim();
const customEndpoint = process.env.TUYA_ENDPOINT?.trim();
const defaultRegion = process.env.TUYA_REGION?.trim().toLowerCase() || 'eu';

const cachedTokens = new Map();

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function signRequest({ method, path, body = '', accessToken = '' }) {
  const timestamp = Date.now().toString();
  const stringToSign = `${method}\n${sha256(body)}\n\n${path}`;
  const payload = `${clientId}${accessToken}${timestamp}${stringToSign}`;
  const sign = createHmac('sha256', clientSecret).update(payload).digest('hex').toUpperCase();

  return {
    client_id: clientId,
    sign,
    sign_method: 'HMAC-SHA256',
    t: timestamp,
    ...(accessToken ? { access_token: accessToken } : {}),
  };
}

function resolveEndpoint(region = defaultRegion) {
  const endpoint = customEndpoint || REGION_ENDPOINTS[region];
  if (!endpoint) throw new Error(`Неизвестный регион Tuya: ${region}`);
  return endpoint;
}

async function tuyaFetch(method, path, { body, accessToken = '', region } = {}) {
  const bodyText = body === undefined ? '' : JSON.stringify(body);
  const endpoint = resolveEndpoint(region);
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      ...signRequest({ method, path, body: bodyText, accessToken }),
      ...(bodyText ? { 'content-type': 'application/json' } : {}),
    },
    ...(bodyText ? { body: bodyText } : {}),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.msg || `Tuya Cloud ответил HTTP ${response.status}`);
    error.code = payload?.code || response.status;
    throw error;
  }

  return payload.result;
}

async function getAccessToken(region, forceRefresh = false) {
  if (!clientId || !clientSecret) {
    throw new Error('Tuya Cloud не настроен на сервере');
  }

  const endpoint = resolveEndpoint(region);
  const cachedToken = cachedTokens.get(endpoint);
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const result = await tuyaFetch('GET', '/v1.0/token?grant_type=1', { region });
  const nextToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number(result.expire_time || 7200) - 60) * 1000,
  };
  cachedTokens.set(endpoint, nextToken);
  return nextToken.value;
}

async function authorizedRequest(method, path, body, region) {
  let accessToken = await getAccessToken(region);
  try {
    return await tuyaFetch(method, path, { body, accessToken, region });
  } catch (error) {
    if (!['1010', '1011', 1010, 1011].includes(error.code)) throw error;
    accessToken = await getAccessToken(region, true);
    return tuyaFetch(method, path, { body, accessToken, region });
  }
}

export function isTuyaCloudConfigured() {
  return Boolean(clientId && clientSecret);
}

export async function getCloudRelayState(deviceId, dpCode, region) {
  const statuses = await authorizedRequest(
    'GET',
    `/v1.0/devices/${deviceId}/status`,
    undefined,
    region,
  );
  const status = Array.isArray(statuses)
    ? statuses.find((item) => item.code === dpCode)
    : null;

  if (!status || ![true, false, 'true', 'false'].includes(status.value)) {
    throw new Error(`Tuya не вернул логический статус ${dpCode}`);
  }
  return status.value === true || status.value === 'true';
}

export async function setCloudRelayState(deviceId, dpCode, region, on) {
  const accepted = await authorizedRequest(
    'POST',
    `/v1.0/devices/${deviceId}/commands`,
    { commands: [{ code: dpCode, value: on }] },
    region,
  );
  if (accepted !== true) throw new Error('Tuya не принял команду реле');
  return on;
}
