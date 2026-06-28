import { useEffect, useState } from 'react';

/** Тикающие «сейчас» (epoch ms) — для живых таймеров и часов.
 *  Один интервал на компонент; снимается при размонтировании. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
