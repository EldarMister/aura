import { io, Socket } from 'socket.io-client';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { CLOUD_SYNC_ROOM, CLOUD_SYNC_URL } from '@/config/syncConfig';
import { createLanClient, createLanServer, LanLink } from '@/lib/lanTransport';
import { useStore } from '@/store/useStore';
import { ConnectionConfig, SyncSnapshot } from '@/types';

/**
 * Слой синхронизации пульта (телефон) и табло (ТВ).
 *
 * Два транспорта, выбор по `connection.mode`:
 *  - 'cloud' — socket.io к серверу на хостинге (работает и в Expo Go);
 *  - 'lan'   — прямой TCP по Wi-Fi без ПК/интернета (ТВ хостит, телефон клиент;
 *              нужен собственный билд — нативный модуль).
 *
 * Роль: controller (пульт) шлёт снимок столов при изменениях; display (табло)
 * применяет входящие снимки в стор (read-only зеркало).
 */

interface Transport {
  push: (snap: SyncSnapshot) => void;
  stop: () => void;
}

let transport: Transport | null = null;
let lanReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastConnKey = '';
let lastSnapshot = '';

const snapshot = (): SyncSnapshot => {
  const s = useStore.getState();
  return {
    tables: s.tables,
    tariffs: s.tariffs,
    drinks: s.drinks,
    history: s.history,
    gameCounter: s.gameCounter,
  };
};

const setStatus = (s: Parameters<ReturnType<typeof useStore.getState>['setConnStatus']>[0]) =>
  useStore.getState().setConnStatus(s);

const applySnapshot = (snap: SyncSnapshot) => {
  const { connection, applyRemoteSnapshot } = useStore.getState();
  if (connection.role === 'display' && snap) applyRemoteSnapshot(snap);
};

const applyCloudSnapshot = (snap: SyncSnapshot) => {
  if (!snap) return;
  applySnapshot(snap);
};

/* --------------------------------- cloud ---------------------------------- */

function startCloud(conn: ConnectionConfig): Transport {
  const url = conn.cloudUrl.trim() || CLOUD_SYNC_URL;
  const room = conn.room.trim() || CLOUD_SYNC_ROOM;
  if (!url) {
    setStatus('idle');
    return { push: () => undefined, stop: () => undefined };
  }
  setStatus('connecting');
  const socket: Socket = io(url, {
    // На части Android TV WebSocket после возврата Wi-Fi может остаться в
    // подвешенном состоянии. Polling остаётся резервным транспортом.
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 7000,
    randomizationFactor: 0.4,
    timeout: 8000,
  });

  const joinAndSync = () => {
    setStatus('connected');
    socket.emit('join', { room, role: conn.role });
    if (conn.role === 'controller') {
      const snap = snapshot();
      lastSnapshot = JSON.stringify(snap);
      socket.emit('state', snap);
    } else {
      socket.emit('request-state');
    }
  };

  socket.on('connect', joinAndSync);
  socket.io.on('reconnect_attempt', () => setStatus('connecting'));
  socket.io.on('reconnect_error', () => setStatus('connecting'));

  let stopped = false;
  let recoveryTimers: ReturnType<typeof setTimeout>[] = [];

  const clearRecoveryTimers = () => {
    recoveryTimers.forEach(clearTimeout);
    recoveryTimers = [];
  };

  const reconnect = () => {
    if (stopped || socket.connected) return;
    setStatus('connecting');
    socket.connect();
  };

  // Срабатывает именно в момент, когда Android сообщил о возврате сети.
  // Повторные попытки нужны, потому что Wi-Fi часто появляется раньше,
  // чем телевизор получает доступ к интернету.
  const recoverAfterNetworkReturn = () => {
    clearRecoveryTimers();
    reconnect();
    [1000, 3000, 7000].forEach((delay) => {
      recoveryTimers.push(setTimeout(reconnect, delay));
    });
    recoveryTimers.push(
      setTimeout(() => {
        if (stopped || socket.connected) return;
        // Перезапускаем только клиентское подключение, если менеджер
        // socket.io остался в старом состоянии после долгого офлайна.
        socket.disconnect();
        socket.connect();
      }, 12000),
    );
  };

  const networkSubscription = Network.addNetworkStateListener((state) => {
    const networkAvailable = state.isConnected && state.isInternetReachable !== false;
    if (networkAvailable) recoverAfterNetworkReturn();
    else if (!socket.connected) setStatus('connecting');
  });

  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') recoverAfterNetworkReturn();
  });

  const reconnectWatchdog = setInterval(() => {
    reconnect();
  }, 5000);

  socket.on('disconnect', () => {
    setStatus('connecting');
  });
  socket.on('state', (snap: SyncSnapshot) => {
    applyCloudSnapshot(snap);
    lastSnapshot = JSON.stringify(snapshot());
  });
  socket.on('state-missing', () => {
    if (conn.role === 'controller') socket.emit('state', snapshot());
  });
  socket.on('connect_error', () => setStatus('connecting'));

  return {
    push: (snap) => {
      if (socket.connected) socket.emit('state', snap);
    },
    stop: () => {
      stopped = true;
      clearInterval(reconnectWatchdog);
      clearRecoveryTimers();
      networkSubscription.remove();
      appStateSubscription.remove();
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_error');
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}

/* ---------------------------------- lan ----------------------------------- */

function startLan(conn: ConnectionConfig): Transport {
  // ТВ — хост (TCP-сервер)
  if (conn.role === 'display') {
    setStatus('connecting');
    let link: LanLink | null = null;
    try {
      link = createLanServer({
        onMessage: (msg) => {
          if (msg?.type === 'state') applySnapshot(msg.snapshot);
        },
        onListening: () => setStatus('connected'),
        onError: () => setStatus('error'),
      });
    } catch {
      setStatus('error'); // нет нативного модуля (например, Expo Go)
    }
    return { push: () => undefined, stop: () => link?.stop() };
  }

  // Телефон — клиент (TCP) к IP телевизора, с переподключением
  const host = conn.lanHost.trim();
  if (!host) {
    setStatus('idle');
    return { push: () => undefined, stop: () => undefined };
  }

  let link: LanLink | null = null;
  let stopped = false;

  const connectClient = () => {
    if (stopped) return;
    setStatus('connecting');
    try {
      link = createLanClient(host, {
        onConnect: () => {
          setStatus('connected');
          link?.send({ type: 'state', snapshot: snapshot() });
        },
        onError: () => setStatus('error'),
        onClose: () => {
          setStatus('connecting');
          scheduleReconnect();
        },
      });
    } catch {
      setStatus('error');
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    if (lanReconnectTimer) clearTimeout(lanReconnectTimer);
    lanReconnectTimer = setTimeout(connectClient, 2000);
  };

  connectClient();

  return {
    push: (snap) => link?.send({ type: 'state', snap, snapshot: snap }),
    stop: () => {
      stopped = true;
      if (lanReconnectTimer) clearTimeout(lanReconnectTimer);
      link?.stop();
    },
  };
}

/* --------------------------------- общий ---------------------------------- */

function rebuild(conn: ConnectionConfig) {
  if (transport) {
    transport.stop();
    transport = null;
  }
  if (lanReconnectTimer) {
    clearTimeout(lanReconnectTimer);
    lanReconnectTimer = null;
  }
  lastSnapshot = '';

  if (conn.mode === 'off') {
    setStatus('idle');
    return;
  }
  transport = conn.mode === 'cloud' ? startCloud(conn) : startLan(conn);
}

function pushIfChanged() {
  const { connection } = useStore.getState();
  if (!transport || connection.mode === 'off' || connection.role !== 'controller') return;
  const snap = snapshot();
  const json = JSON.stringify(snap);
  if (json === lastSnapshot) return;
  lastSnapshot = json;
  transport.push(snap);
}

/** Инициализация один раз при старте приложения. */
export function initSync() {
  const apply = (conn: ConnectionConfig) => {
    const key = JSON.stringify(conn);
    if (key !== lastConnKey) {
      lastConnKey = key;
      rebuild(conn);
    }
  };

  apply(useStore.getState().connection);

  useStore.subscribe((state) => {
    apply(state.connection);
    if (state.connection.role === 'controller' && state.connection.mode !== 'off') {
      pushIfChanged();
    }
  });
}
