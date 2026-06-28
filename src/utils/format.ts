/** Форматирование чисел/времени без зависимостей от Intl (Hermes на Android
 *  не всегда поддерживает locale в toLocaleString). */

/** 1500 -> "1 500 с" */
export function money(n: number): string {
  const v = Math.round(n);
  const s = Math.abs(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v < 0 ? '-' : ''}${s} с`;
}

const pad = (x: number) => x.toString().padStart(2, '0');

/** Секунды -> "01:24:35" */
export function clock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** Date -> "16:59:27" (для часов на экране телевизора). */
export function wallClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 5 -> "№005" */
export function gameNo(n: number): string {
  return `№${n.toString().padStart(3, '0')}`;
}

/** epoch ms -> "04:50" */
export function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** epoch ms -> "25.06.2026 04:50" */
export function dateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** минуты -> "1 ч 30 мин" / "1 ч 00 мин" / "30 мин" */
export function duration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} ч ${pad(m)} мин` : `${m} мин`;
}

/** Русское склонение: plural(8, 'игра','игры','игр') -> "игр" */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
