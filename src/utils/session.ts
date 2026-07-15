import { GameSession } from '@/types';

/** Прошедшее время сессии в секундах (реальное, от момента открытия). */
export function elapsedSeconds(session: GameSession, now: number): number {
  const effectiveNow = session.status === 'paused' && session.pausedAt ? session.pausedAt : now;
  return Math.max(0, Math.floor((effectiveNow - session.startedAt - (session.pausedMs ?? 0)) / 1000));
}

/** Стоимость напитков сессии. */
export function drinksTotal(session: GameSession): number {
  return session.drinks.reduce((s, d) => s + d.price * d.quantity, 0);
}

/** Стоимость фактически прошедшего времени по тарифу. */
export function timeCost(session: GameSession, now = Date.now()): number {
  const hours = elapsedSeconds(session, now) / 3600;
  return Math.round(hours * session.pricePerHour);
}

/** Итог = фактическое время по тарифу + напитки. */
export function sessionTotal(session: GameSession, now = Date.now()): number {
  return timeCost(session, now) + drinksTotal(session);
}
