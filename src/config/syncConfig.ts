export const CLOUD_SYNC_URL = process.env.EXPO_PUBLIC_SYNC_URL?.trim() ?? '';
export const CLOUD_SYNC_ROOM = process.env.EXPO_PUBLIC_SYNC_ROOM?.trim() || 'default';

export const hasCloudEnv = CLOUD_SYNC_URL.length > 0;
