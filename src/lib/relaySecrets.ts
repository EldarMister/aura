import * as SecureStore from 'expo-secure-store';

import { RELAY_ENV_API_TOKEN } from '@/config/relayConfig';

const API_TOKEN_NAME = 'billiard-relay-api-token';

export interface RelaySecrets {
  apiToken: string;
}

async function readSecret(name: string, fallback = '') {
  try {
    return (await SecureStore.getItemAsync(name)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeSecret(name: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) {
    await SecureStore.setItemAsync(name, trimmed);
  } else {
    await SecureStore.deleteItemAsync(name);
  }
}

export async function getRelaySecrets(): Promise<RelaySecrets> {
  const apiToken = await readSecret(API_TOKEN_NAME, RELAY_ENV_API_TOKEN);
  return {
    apiToken,
  };
}

export async function saveRelaySecrets(secrets: RelaySecrets) {
  await writeSecret(API_TOKEN_NAME, secrets.apiToken);
}
