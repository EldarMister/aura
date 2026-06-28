import { useEffect, useRef } from 'react';

import { useNow } from '@/hooks/useNow';
import { playTableTimeUp } from '@/lib/sound';
import { useStore } from '@/store/useStore';
import { remainingSeconds } from '@/utils/session';

/** Global watcher for table timeout voice alerts. Renders nothing. */
export function TimeUpSoundWatcher() {
  const now = useNow();
  const tables = useStore((s) => s.tables);
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    tables.forEach((table, index) => {
      const session = table.session;
      if (table.status !== 'active' || !session || session.status !== 'active') return;

      const key = `${table.id}:${session.startedAt}:${session.durationSeconds}`;
      if (remainingSeconds(session, now) > 0 || announced.current.has(key)) return;

      announced.current.add(key);
      void playTableTimeUp(index);
    });
  }, [now, tables]);

  return null;
}
