/**
 * Прямой LAN-транспорт телефон ↔ ТВ по Wi-Fi, без ПК и без интернета.
 * ТВ (display) поднимает TCP-сервер, телефон (controller) подключается клиентом
 * и шлёт снимки столов. Сообщения — JSON, разделённые '\n'.
 *
 * Нативный модуль (react-native-tcp-socket) грузится ЛЕНИВО — чтобы облачный
 * режим и Expo Go (где модуля нет) продолжали работать.
 */

export const LAN_PORT = 3001;

export interface LanLink {
  send: (obj: unknown) => void;
  stop: () => void;
}

interface ServerHandlers {
  onMessage: (msg: any) => void;
  onListening?: () => void;
  onError?: (e: unknown) => void;
}

interface ClientHandlers {
  onConnect?: () => void;
  onMessage?: (msg: any) => void;
  onError?: (e: unknown) => void;
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
function loadTcp(): any {
  // require внутри функции — модуль не трогается, пока LAN-режим не включён
  return require('react-native-tcp-socket').default ?? require('react-native-tcp-socket');
}

const frame = (obj: unknown) => JSON.stringify(obj) + '\n';

function makeParser(onMessage: (msg: any) => void) {
  let buf = '';
  return (chunk: Buffer | string) => {
    buf += typeof chunk === 'string' ? chunk : chunk.toString();
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.trim()) {
        try {
          onMessage(JSON.parse(line));
        } catch {
          /* битый фрейм — пропускаем */
        }
      }
    }
  };
}

/** ТВ-сторона: TCP-сервер, принимает снимки от телефона. */
export function createLanServer(handlers: ServerHandlers): LanLink {
  const Tcp = loadTcp();
  const clients = new Set<any>();

  const server = Tcp.createServer((socket: any) => {
    clients.add(socket);
    const parse = makeParser(handlers.onMessage);
    socket.on('data', parse);
    socket.on('error', () => undefined);
    socket.on('close', () => clients.delete(socket));
  });

  server.on('error', (e: unknown) => handlers.onError?.(e));
  server.listen({ port: LAN_PORT, host: '0.0.0.0' }, () => handlers.onListening?.());

  return {
    send: (obj) => {
      const data = frame(obj);
      clients.forEach((c) => {
        try {
          c.write(data);
        } catch {
          /* пропускаем */
        }
      });
    },
    stop: () => {
      clients.forEach((c) => {
        try {
          c.destroy();
        } catch {
          /* пропускаем */
        }
      });
      clients.clear();
      try {
        server.close();
      } catch {
        /* пропускаем */
      }
    },
  };
}

/** Телефон-сторона: TCP-клиент к IP телевизора. */
export function createLanClient(host: string, handlers: ClientHandlers): LanLink {
  const Tcp = loadTcp();
  const socket = Tcp.createConnection({ host, port: LAN_PORT }, () => handlers.onConnect?.());
  const parse = makeParser((msg) => handlers.onMessage?.(msg));
  socket.on('data', parse);
  socket.on('error', (e: unknown) => handlers.onError?.(e));
  socket.on('close', () => handlers.onClose?.());

  return {
    send: (obj) => {
      try {
        socket.write(frame(obj));
      } catch {
        /* пропускаем */
      }
    },
    stop: () => {
      try {
        socket.destroy();
      } catch {
        /* пропускаем */
      }
    },
  };
}
