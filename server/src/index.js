import 'dotenv/config';

import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { Pool } from 'pg';
import { Server } from 'socket.io';

import {
  getRelayCapabilities,
  getRelayState,
  setRelayState,
} from './relayService.js';

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL?.trim();
const relayApiToken = process.env.RELAY_API_TOKEN?.trim();

const memoryState = new Map();
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    })
  : null;

async function initDb() {
  if (!pool) return;
  await pool.query(`
    create table if not exists cloud_state (
      room text primary key,
      snapshot jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
}

async function loadState(room) {
  if (!pool) return memoryState.get(room) ?? null;
  const result = await pool.query('select snapshot from cloud_state where room = $1', [room]);
  return result.rows[0]?.snapshot ?? null;
}

async function saveState(room, snapshot) {
  const nextSnapshot = { ...snapshot, updatedAt: Date.now() };
  if (!pool) {
    memoryState.set(room, nextSnapshot);
    return nextSnapshot;
  }
  await pool.query(
    `
      insert into cloud_state (room, snapshot, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (room)
      do update set snapshot = excluded.snapshot, updated_at = now()
    `,
    [room, JSON.stringify(nextSnapshot)],
  );
  return nextSnapshot;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function isAuthorized(req) {
  if (!relayApiToken) return false;
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const expected = Buffer.from(relayApiToken);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error('Слишком большой запрос');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handleRelayApi(req, res, url) {
  if (!url.pathname.startsWith('/api/relay/')) return false;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return true;
  }
  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: 'Нет доступа к управлению реле' });
    return true;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/relay/status') {
      const tableId = url.searchParams.get('tableId') || '';
      const transport = url.searchParams.get('transport') || 'auto';
      if (!['auto', 'local', 'cloud'].includes(transport)) {
        sendJson(res, 400, { ok: false, error: 'Неизвестный канал управления реле' });
        return true;
      }
      const result = await getRelayState(tableId, transport);
      sendJson(res, 200, { ok: true, tableId, ...result });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/relay/status') {
      const { tableId, transport = 'auto', device } = await readJson(req);
      if (typeof tableId !== 'string') {
        sendJson(res, 400, { ok: false, error: 'Нужно поле tableId' });
        return true;
      }
      if (!['auto', 'local', 'cloud'].includes(transport)) {
        sendJson(res, 400, { ok: false, error: 'Неизвестный канал управления реле' });
        return true;
      }
      const result = await getRelayState(tableId, transport, device);
      sendJson(res, 200, { ok: true, tableId, ...result });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/relay/control') {
      const { tableId, on, transport = 'auto', device } = await readJson(req);
      if (typeof tableId !== 'string' || typeof on !== 'boolean') {
        sendJson(res, 400, { ok: false, error: 'Нужны tableId и логическое поле on' });
        return true;
      }
      if (!['auto', 'local', 'cloud'].includes(transport)) {
        sendJson(res, 400, { ok: false, error: 'Неизвестный канал управления реле' });
        return true;
      }
      const result = await setRelayState(tableId, on, transport, device);
      sendJson(res, 200, { ok: true, tableId, ...result });
      return true;
    }

    sendJson(res, 404, { ok: false, error: 'Команда реле не найдена' });
  } catch (error) {
    console.error('Relay API:', error);
    sendJson(res, 503, {
      ok: false,
      error: error instanceof Error ? error.message : 'Ошибка управления реле',
    });
  }
  return true;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (await handleRelayApi(req, res, url)) return;

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      storage: pool ? 'postgres' : 'memory',
      relay: getRelayCapabilities(),
    });
    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Billiard POS sync server');
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5e6,
});

io.on('connection', (socket) => {
  let currentRoom = 'default';

  socket.on('join', async ({ room, role } = {}) => {
    currentRoom = String(room || 'default');
    socket.join(currentRoom);
    socket.data.role = role || 'unknown';
  });

  socket.on('request-state', async () => {
    try {
      const state = await loadState(currentRoom);
      socket.emit(state ? 'state' : 'state-missing', state);
    } catch (error) {
      socket.emit('sync-error', { message: 'Failed to load state' });
      console.error(error);
    }
  });

  socket.on('state', async (snapshot) => {
    try {
      const saved = await saveState(currentRoom, snapshot);
      io.to(currentRoom).emit('state', saved);
    } catch (error) {
      socket.emit('sync-error', { message: 'Failed to save state' });
      console.error(error);
    }
  });
});

await initDb();

httpServer.listen(port, () => {
  console.log(`Billiard POS sync server listening on :${port}`);
  console.log(`Storage: ${pool ? 'postgres' : 'memory'}`);
});
