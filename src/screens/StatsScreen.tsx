import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { GameRow } from '@/components/GameRow';
import { AllGamesModal } from '@/components/modals/AllGamesModal';
import { GameDetailModal } from '@/components/modals/GameDetailModal';
import { Page } from '@/components/Page';
import { BottomBar, Card, ScreenHeader, Segmented } from '@/components/ui';
import { colors, focusFill, focusRing, sp } from '@/theme';
import { GameRecord, StatsPeriod } from '@/types';
import { useStore } from '@/store/useStore';
import { money, plural } from '@/utils/format';

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
];

const PREVIEW_COUNT = 3;

function periodStart(period: StatsPeriod): number {
  const now = new Date();
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  const days = period === 'week' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function StatsScreen() {
  const history = useStore((s) => s.history);
  const tables = useStore((s) => s.tables);
  const go = useStore((s) => s.go);
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const [allOpen, setAllOpen] = useState(false);
  const [detail, setDetail] = useState<GameRecord | null>(null);

  const data = useMemo(() => {
    const from = periodStart(period);
    // history уже отсортирована новыми сверху
    const games = history.filter((r) => r.endedAt >= from);
    const completed = games.filter((r) => r.status === 'completed');
    const perTable = new Map<string, number>();
    let drinksSold = 0;
    let revenue = 0;
    for (const r of completed) {
      drinksSold += r.drinksCount;
      revenue += r.totalAmount;
      perTable.set(r.tableId, (perTable.get(r.tableId) ?? 0) + 1);
    }
    return { games, completed, drinksSold, revenue, perTable };
  }, [history, period]);

  return (
    <Page
      footer={
        <BottomBar
          left={{ label: 'Главная', icon: 'home', onPress: () => go('tables') }}
          right={{ label: 'Настройки', icon: 'settings', onPress: () => go('settings') }}
        />
      }
    >
      <ScreenHeader title="Статистика" />

      <Segmented items={PERIODS} value={period} onChange={setPeriod} />

      <Card style={{ marginTop: sp(4), marginBottom: sp(5) }}>
        <StatRow label="Продано напитков" value={`${data.drinksSold} шт.`} />
        <Divider />
        <StatRow label="Было игр" value={`${data.completed.length}`} />
        <Divider />
        <StatRow label="Выручка" value={money(data.revenue)} />
      </Card>

      <Card style={{ marginBottom: sp(5) }}>
        <Text style={styles.cardTitle}>По столам</Text>
        <View style={{ marginTop: sp(3) }}>
          {tables.map((t, i) => {
            const n = data.perTable.get(t.id) ?? 0;
            return (
              <View key={t.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.tableName}>{t.name}</Text>
                <Text style={styles.green}>
                  {n} {plural(n, 'игра', 'игры', 'игр')}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Все игры */}
      <Card>
        <Text style={styles.cardTitle}>Все игры</Text>
        {data.games.length === 0 ? (
          <Text style={styles.empty}>За этот период игр нет.</Text>
        ) : (
          <>
            <View style={{ marginTop: sp(2) }}>
              {data.games.slice(0, PREVIEW_COUNT).map((g) => (
                <GameRow key={g.id} game={g} onPress={() => setDetail(g)} />
              ))}
            </View>
            <Pressable
              onPress={() => setAllOpen(true)}
              hitSlop={8}
              style={({ focused, pressed }) => [
                styles.linkWrap,
                focused && focusFill,
                focused && focusRing,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.link}>Смотреть все</Text>
            </Pressable>
          </>
        )}
      </Card>

      <AllGamesModal
        visible={allOpen}
        period={period}
        games={data.games}
        onClose={() => setAllOpen(false)}
        onOpenGame={(g) => {
          setAllOpen(false);
          setDetail(g);
        }}
      />
      <GameDetailModal game={detail} onClose={() => setDetail(null)} />
    </Page>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.green}>{value}</Text>
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(2),
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: sp(3) },
  label: { fontSize: 15, color: colors.textMuted },
  green: { fontSize: 19, fontWeight: '700', color: colors.green },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  tableName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  empty: { fontSize: 14, color: colors.textMuted, marginTop: sp(3) },
  linkWrap: {
    marginTop: sp(2),
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: sp(2),
    paddingVertical: sp(1),
    marginLeft: -sp(2),
  },
  link: { fontSize: 15, fontWeight: '600', color: colors.blue },
});
