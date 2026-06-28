import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ConnectionConfig,
  ConnStatus,
  Drink,
  GameRecord,
  ScreenName,
  SyncSnapshot,
  Table,
  Tariff,
} from '@/types';
import { drinksTotal, sessionTotal, timeCost } from '@/utils/session';
import { uid } from '@/utils/format';

/* ----------------------------- начальные данные ---------------------------- */

const seedTariffs: Tariff[] = [
  { id: 't-std', name: 'Стандартный', pricePerHour: 600 },
  { id: 't-prem', name: 'Премиум', pricePerHour: 900 },
];

const seedDrinks: Drink[] = [
  { id: 'd-cola', name: 'Кола', price: 150 },
  { id: 'd-tea', name: 'Чай чёрный', price: 100 },
  { id: 'd-water', name: 'Минеральная вода', price: 120 },
];

const seedTables: Table[] = [
  { id: 'table-1', name: 'Стол 1', status: 'free', session: null },
  { id: 'table-2', name: 'Стол 2', status: 'free', session: null },
];

const seedConnection: ConnectionConfig = {
  mode: 'off',
  role: 'controller',
  room: '',
  cloudUrl: '',
  lanHost: '',
};

/* --------------------------------- store ---------------------------------- */

interface StoreState {
  /** навигация (лёгкая, без react-navigation) */
  screen: ScreenName;
  selectedTableId: string;

  tables: Table[];
  tariffs: Tariff[];
  drinks: Drink[];
  history: GameRecord[];
  gameCounter: number; // последний выданный номер игры

  /* связь ТВ ↔ телефон */
  connection: ConnectionConfig;
  connStatus: ConnStatus;
  setConnection: (patch: Partial<ConnectionConfig>) => void;
  setConnStatus: (status: ConnStatus) => void;
  applyRemoteSnapshot: (snap: SyncSnapshot) => void;

  /* nav */
  go: (screen: ScreenName) => void;
  selectTable: (tableId: string) => void;

  /* сессии столов */
  openGame: (tableId: string, tariffId: string, durationSeconds: number) => void;
  changeTariff: (tableId: string, tariffId: string) => void;
  addTime: (tableId: string, minutes: number) => void;
  resetTime: (tableId: string) => void;
  setDrinkQty: (tableId: string, drink: Drink, quantity: number) => void;
  closeTable: (tableId: string) => void;

  /* справочники (настройки) */
  upsertDrink: (drink: { id?: string; name: string; price: number }) => void;
  removeDrink: (id: string) => void;
  upsertTariff: (tariff: { id?: string; name: string; pricePerHour: number }) => void;
  removeTariff: (id: string) => void;
}

const mapTable = (
  state: StoreState,
  tableId: string,
  fn: (t: Table) => Table,
): Pick<StoreState, 'tables'> => ({
  tables: state.tables.map((t) => (t.id === tableId ? fn(t) : t)),
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      screen: 'tables',
      selectedTableId: seedTables[0].id,

      tables: seedTables,
      tariffs: seedTariffs,
      drinks: seedDrinks,
      history: [],
      gameCounter: 0,

      connection: seedConnection,
      connStatus: 'idle',
      setConnection: (patch) =>
        set((state) => ({ connection: { ...state.connection, ...patch } })),
      setConnStatus: (connStatus) => set({ connStatus }),
      // Табло применяет снимок от пульта (read-only зеркало столов/справочников).
      applyRemoteSnapshot: (snap) =>
        set((state) => ({
          tables: snap.tables ?? state.tables,
          tariffs: snap.tariffs ?? state.tariffs,
          drinks: snap.drinks ?? state.drinks,
          history: snap.history ?? state.history,
          gameCounter: snap.gameCounter ?? state.gameCounter,
        })),

      go: (screen) => set({ screen }),
      selectTable: (selectedTableId) => set({ selectedTableId }),

      openGame: (tableId, tariffId, durationSeconds) =>
        set((state) => {
          const tariff = state.tariffs.find((t) => t.id === tariffId);
          if (!tariff) return {};
          return mapTable(state, tableId, (t) => ({
            ...t,
            status: 'active',
            session: {
              tableId,
              tariffId: tariff.id,
              tariffName: tariff.name,
              pricePerHour: tariff.pricePerHour,
              startedAt: Date.now(),
              durationSeconds: Math.max(0, Math.round(durationSeconds)),
              drinks: [],
              status: 'active',
            },
          }));
        }),

      changeTariff: (tableId, tariffId) =>
        set((state) => {
          const tariff = state.tariffs.find((t) => t.id === tariffId);
          return mapTable(state, tableId, (t) =>
            t.session && tariff
              ? {
                  ...t,
                  session: {
                    ...t.session,
                    tariffId: tariff.id,
                    tariffName: tariff.name,
                    pricePerHour: tariff.pricePerHour,
                  },
                }
              : t,
          );
        }),

      // Добавляет минуты к забронированному времени (продлевает обратный отсчёт).
      addTime: (tableId, minutes) =>
        set((state) =>
          mapTable(state, tableId, (t) =>
            t.session
              ? {
                  ...t,
                  session: {
                    ...t.session,
                    durationSeconds: Math.max(0, t.session.durationSeconds + minutes * 60),
                  },
                }
              : t,
          ),
        ),

      // Перезапускает отсчёт с начала (полное забронированное время заново).
      resetTime: (tableId) =>
        set((state) =>
          mapTable(state, tableId, (t) =>
            t.session ? { ...t, session: { ...t.session, startedAt: Date.now() } } : t,
          ),
        ),

      setDrinkQty: (tableId, drink, quantity) =>
        set((state) =>
          mapTable(state, tableId, (t) => {
            if (!t.session) return t;
            const qty = Math.max(0, quantity);
            const exists = t.session.drinks.some((d) => d.drinkId === drink.id);
            let drinks = t.session.drinks;
            if (exists) {
              drinks = t.session.drinks
                .map((d) => (d.drinkId === drink.id ? { ...d, quantity: qty } : d))
                .filter((d) => d.quantity > 0);
            } else if (qty > 0) {
              drinks = [
                ...t.session.drinks,
                { drinkId: drink.id, name: drink.name, price: drink.price, quantity: qty },
              ];
            }
            return { ...t, session: { ...t.session, drinks } };
          }),
        ),

      closeTable: (tableId) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === tableId);
          if (!table || !table.session) return {};
          const now = Date.now();
          const s = table.session;
          const tableAmount = timeCost(s);
          const drinksAmount = drinksTotal(s);
          const number = state.gameCounter + 1;
          const record: GameRecord = {
            id: uid(),
            number,
            tableId: table.id,
            tableName: table.name,
            tariffId: s.tariffId,
            tariffName: s.tariffName,
            pricePerHour: s.pricePerHour,
            startedAt: s.startedAt,
            endedAt: now,
            durationMinutes: Math.round(s.durationSeconds / 60),
            drinks: s.drinks.map((d) => ({ ...d, total: d.price * d.quantity })),
            drinksCount: s.drinks.reduce((n, d) => n + d.quantity, 0),
            tableAmount,
            drinksAmount,
            totalAmount: tableAmount + drinksAmount,
            status: 'completed',
          };
          return {
            history: [record, ...state.history],
            gameCounter: number,
            ...mapTable(state, tableId, (t) => ({ ...t, status: 'free', session: null })),
          };
        }),

      upsertDrink: ({ id, name, price }) =>
        set((state) => {
          if (id) {
            return { drinks: state.drinks.map((d) => (d.id === id ? { ...d, name, price } : d)) };
          }
          return { drinks: [...state.drinks, { id: uid(), name, price }] };
        }),

      removeDrink: (id) => set((state) => ({ drinks: state.drinks.filter((d) => d.id !== id) })),

      upsertTariff: ({ id, name, pricePerHour }) =>
        set((state) => {
          if (id) {
            return {
              tariffs: state.tariffs.map((t) =>
                t.id === id ? { ...t, name, pricePerHour } : t,
              ),
            };
          }
          return { tariffs: [...state.tariffs, { id: uid(), name, pricePerHour }] };
        }),

      removeTariff: (id) =>
        set((state) => ({ tariffs: state.tariffs.filter((t) => t.id !== id) })),
    }),
    {
      name: 'billiard-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // В v1 поменялась схема истории (номера игр, *Amount). Старые записи
      // несовместимы — сбрасываем историю, справочники при этом сохраняем.
      migrate: (persisted, version) => {
        const state = persisted as Partial<StoreState> | undefined;
        if (state && version < 1) {
          return { ...state, history: [], gameCounter: 0 } as StoreState;
        }
        return state as StoreState;
      },
      // экран — это UI-состояние, его не сохраняем между запусками
      partialize: (s) => ({
        selectedTableId: s.selectedTableId,
        tables: s.tables,
        tariffs: s.tariffs,
        drinks: s.drinks,
        history: s.history,
        gameCounter: s.gameCounter,
        connection: s.connection,
      }),
    },
  ),
);

/* --------------------------------- селекторы -------------------------------- */

export const useSelectedTable = (): Table => {
  const tables = useStore((s) => s.tables);
  const selectedId = useStore((s) => s.selectedTableId);
  return tables.find((t) => t.id === selectedId) ?? tables[0];
};

export { drinksTotal, sessionTotal, timeCost };
