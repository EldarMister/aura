import { GameSession } from '@/types';

/** Прошедшее время сессии в секундах (реальное, от момента открытия). */
export function elapsedSeconds(session: GameSession, now: number): number {
  return Math.max(0, Math.floor((now - session.startedAt) / 1000));
}

/** Остаток забронированного времени в секундах (обратный отсчёт, не уходит ниже 0). */
export function remainingSeconds(session: GameSession, now: number): number {
  return Math.max(0, session.durationSeconds - elapsedSeconds(session, now));
}

/** Признак, что забронированное время вышло. */
export function isTimeUp(session: GameSession, now: number): boolean {
  return remainingSeconds(session, now) <= 0;
}

/** Уровень тревоги таймера по доле прошедшего времени:
 *  normal < 70% ≤ warn(жёлтый) < 90% ≤ danger(красный). */
export type TimerLevel = 'normal' | 'warn' | 'danger';
export function timerLevel(session: GameSession, now: number): TimerLevel {
  if (session.durationSeconds <= 0) return 'normal';
  const ratio = elapsedSeconds(session, now) / session.durationSeconds;
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.7) return 'warn';
  return 'normal';
}

/** Таймер мигает на последней минуте (и когда время уже вышло). */
export function shouldBlink(session: GameSession, now: number): boolean {
  return remainingSeconds(session, now) <= 60;
}

/** Стоимость напитков сессии. */
export function drinksTotal(session: GameSession): number {
  return session.drinks.reduce((s, d) => s + d.price * d.quantity, 0);
}

/** Стоимость забронированного времени по тарифу. */
export function timeCost(session: GameSession): number {
  const hours = session.durationSeconds / 3600;
  return Math.round(hours * session.pricePerHour);
}

/** Итог = забронированное время по тарифу + напитки. */
export function sessionTotal(session: GameSession): number {
  return timeCost(session) + drinksTotal(session);
}
