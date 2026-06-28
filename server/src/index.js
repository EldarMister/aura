import 'dotenv/config';

import { createServer } from 'node:http';
import { Pool } from 'pg';
import { Server } from 'socket.io';

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;

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

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, storage: pool ? 'postgres' : 'memory' }));
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
