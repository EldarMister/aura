/** Модели данных. Намеренно простые и сериализуемые — чтобы позже
 *  без переделок отдать их на backend / socket / экран телевизора. */

export type TableStatus = 'free' | 'active';

export interface Tariff {
  id: string;
  name: string;
  pricePerHour: number;
}

export interface Drink {
  id: string;
  name: string;
  price: number;
}

/** Позиция напитка внутри игровой сессии (снимок цены/названия). */
export interface DrinkItem {
  drinkId: string;
  name: string;
  price: number;
  quantity: number;
  total?: number; // price * quantity — заполняется при сохранении игры в историю
}

export interface GameSession {
  tableId: string;
  tariffId: string;
  tariffName: string;
  pricePerHour: number;
  startedAt: number; // epoch ms — момент открытия
  pausedAt?: number | null; // epoch ms — если сейчас на паузе
  pausedMs?: number; // суммарная длительность прошлых пауз
  durationSeconds: number; // забронированное время (для обратного отсчёта)
  drinks: DrinkItem[];
  status: 'active' | 'paused';
}

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  session: GameSession | null;
}

/** Запись о завершённой игре — источник для статистики и истории. */
export interface GameRecord {
  id: string;
  number: number; // порядковый номер игры (№001, №002, …) — не сбрасывается
  tableId: string;
  tableName: string;
  tariffId: string;
  tariffName: string;
  pricePerHour: number;
  startedAt: number;
  endedAt: number;
  durationMinutes: number; // забронированная длительность
  drinks: DrinkItem[];
  drinksCount: number; // суммарное количество напитков
  tableAmount: number; // стоимость времени
  drinksAmount: number; // стоимость напитков
  totalAmount: number; // итог
  status: 'completed' | 'canceled';
}

export type ScreenName = 'tables' | 'settings' | 'stats' | 'tv';
export type StatsPeriod = 'day' | 'week' | 'month';

/* ----------------------------- связь ТВ ↔ телефон ---------------------------- */

/** Режим связи: выкл / облако (хостинг) / локально (Wi-Fi). */
export type ConnMode = 'off' | 'cloud' | 'lan';
/** Роль устройства: пульт (телефон, пишет) / табло (ТВ, читает). */
export type DeviceRole = 'controller' | 'display';
export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface ConnectionConfig {
  mode: ConnMode;
  role: DeviceRole;
  room: string; // код заведения (для облака)
  cloudUrl: string; // https://...onrender.com
  lanHost: string; // IP телевизора в Wi-Fi (для прямого LAN, вводится на телефоне)
}

/** Снимок состояния, который пульт шлёт на табло. */
export interface SyncSnapshot {
  tables: Table[];
  tariffs: Tariff[];
  drinks: Drink[];
  history?: GameRecord[];
  gameCounter?: number;
  updatedAt?: number;
}
