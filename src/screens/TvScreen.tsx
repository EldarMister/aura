import { Feather } from '@expo/vector-icons';
import * as Network from 'expo-network';
import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountdownText } from '@/components/CountdownText';
import { useNow } from '@/hooks/useNow';
import { LAN_PORT } from '@/lib/lanTransport';
import { playTableTimeUp } from '@/lib/sound';
import { colors, sp } from '@/theme';
import { Table } from '@/types';
import { useStore } from '@/store/useStore';
import { money, wallClock } from '@/utils/format';
import { remainingSeconds, sessionTotal } from '@/utils/session';

/**
 * Экран для телевизора. Пока без реального подключения — данные из локального
 * состояния. Раскладка по референсу: часы сверху по центру, два стола слева и
 * справа, тонкая вертикальная линия посередине.
 */
export function TvScreen() {
  const now = useNow();
  const tables = useStore((s) => s.tables);
  const connection = useStore((s) => s.connection);
  const connStatus = useStore((s) => s.connStatus);
  const go = useStore((s) => s.go);
  const { width } = useWindowDimensions();
  const col = width / 2;
  const [localIp, setLocalIp] = useState('');

  useEffect(() => {
    let alive = true;
    if (connection.mode === 'lan' && connection.role === 'display') {
      Network.getIpAddressAsync()
        .then((ip) => {
          if (alive) setLocalIp(ip && ip !== '0.0.0.0' ? ip : '');
        })
        .catch(() => {
          if (alive) setLocalIp('');
        });
    }
    return () => {
      alive = false;
    };
  }, [connection.mode, connection.role]);

  // Озвучка «время вышло»: по разу на каждую сессию (ключ — стол + момент старта).
  const announced = useRef<Set<string>>(new Set());
  useEffect(() => {
    tables.forEach((t, idx) => {
      if (t.status === 'active' && t.session) {
        const key = `${t.id}:${t.session.startedAt}`;
        if (remainingSeconds(t.session, now) <= 0 && !announced.current.has(key)) {
          announced.current.add(key);
          playTableTimeUp(idx);
        }
      }
    });
  }, [now, tables]);

  const fs = {
    title: Math.min(40, Math.max(22, col * 0.17)),
    status: Math.min(20, Math.max(13, col * 0.08)),
    label: Math.min(16, Math.max(12, col * 0.06)),
    value: Math.min(20, Math.max(13, col * 0.075)),
    big: Math.min(34, Math.max(20, col * 0.15)),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => go('tables')}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <Feather name="chevron-left" size={18} color={colors.textMuted} />
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
        <Text style={styles.wallClock}>{wallClock(new Date(now))}</Text>
        {connection.mode === 'lan' && connection.role === 'display' ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.lanAddress,
              connStatus === 'connected' ? styles.lanAddressReady : styles.lanAddressMuted,
            ]}
          >
            IP: {localIp || '...'} · порт {LAN_PORT}
          </Text>
        ) : null}
      </View>

      <View style={styles.columns}>
        <TablePane table={tables[0]} now={now} fs={fs} />
        <View style={styles.vline} />
        <TablePane table={tables[1]} now={now} fs={fs} />
      </View>
    </SafeAreaView>
  );
}

function TablePane({
  table,
  now,
  fs,
}: {
  table: Table;
  now: number;
  fs: { title: number; status: number; label: number; value: number; big: number };
}) {
  const s = table.session;
  const active = table.status === 'active' && !!s;

  return (
    <View style={styles.pane}>
      <View style={styles.titleRow}>
        <Text style={[styles.tableTitle, { fontSize: fs.title }]}>{table.name}</Text>
        <Text style={[styles.status, { fontSize: fs.status }]}>
          {active ? 'Открыт' : 'Свободен'}
        </Text>
      </View>

      {active && s ? (
        <View style={{ marginTop: sp(5), gap: sp(5) }}>
          <View>
            <Text style={[styles.label, { fontSize: fs.label }]}>Тариф</Text>
            <Text style={[styles.value, { fontSize: fs.value }]}>
              {s.tariffName} — {money(s.pricePerHour)}/час
            </Text>
          </View>

          <View style={styles.metricRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontSize: fs.label }]}>Осталось</Text>
              <CountdownText
                session={s}
                now={now}
                fit
                baseColor={colors.green}
                style={[styles.time, { fontSize: fs.big }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontSize: fs.label }]}>Сумма</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.sum, { fontSize: fs.big }]}
              >
                {money(sessionTotal(s))}
              </Text>
            </View>
          </View>

          <View>
            <Text style={[styles.label, { fontSize: fs.label }]}>Напитки</Text>
            {s.drinks.length === 0 ? (
              <Text style={[styles.value, { fontSize: fs.value, color: colors.textMuted }]}>—</Text>
            ) : (
              s.drinks.map((d) => (
                <Text key={d.drinkId} style={[styles.value, { fontSize: fs.value }]}>
                  {d.name} — {d.quantity} × {money(d.price)}
                </Text>
              ))
            )}
          </View>
        </View>
      ) : (
        <Text style={[styles.free, { fontSize: fs.value }]}>Стол свободен</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: sp(4),
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(1),
  },
  backText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  wallClock: { fontSize: 16, color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lanAddress: {
    position: 'absolute',
    right: sp(4),
    maxWidth: '42%',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lanAddressReady: { color: colors.green },
  lanAddressMuted: { color: colors.textMuted },

  columns: { flex: 1, flexDirection: 'row' },
  vline: { width: 1, backgroundColor: colors.border, marginVertical: sp(2) },
  pane: { flex: 1, paddingHorizontal: sp(5), paddingTop: sp(4) },

  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tableTitle: { fontWeight: '800', color: colors.text },
  status: { color: colors.green, fontWeight: '600' },

  label: { color: colors.green, fontWeight: '600', marginBottom: sp(1.5) },
  value: { color: colors.text, fontWeight: '500', marginBottom: 2 },

  metricRow: { flexDirection: 'row' },
  time: { color: colors.green, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sum: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },

  free: { marginTop: sp(6), color: colors.textMuted },
});
