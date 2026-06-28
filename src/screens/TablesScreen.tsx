import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AddDrinksModal } from '@/components/modals/AddDrinksModal';
import { CountdownText } from '@/components/CountdownText';
import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { AddTimeModal } from '@/components/modals/AddTimeModal';
import { EditSessionModal } from '@/components/modals/EditSessionModal';
import { GameDetailModal } from '@/components/modals/GameDetailModal';
import { OpenTableModal } from '@/components/modals/OpenTableModal';
import { Page } from '@/components/Page';
import {
  BottomBar,
  Card,
  ScreenHeader,
  Segmented,
  SquareButton,
} from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { colors, focusFill, focusRing, sp } from '@/theme';
import { GameRecord } from '@/types';
import { useSelectedTable, useStore } from '@/store/useStore';
import { money } from '@/utils/format';
import { sessionTotal } from '@/utils/session';

type ModalKind = 'open' | 'time' | 'drinks' | 'edit' | null;

export function TablesScreen() {
  const now = useNow();
  const tables = useStore((s) => s.tables);
  const table = useSelectedTable();
  const selectTable = useStore((s) => s.selectTable);
  const go = useStore((s) => s.go);
  const closeTable = useStore((s) => s.closeTable);
  const tableTabs = tables.map((t) => ({ key: t.id, label: t.name }));

  const [modal, setModal] = useState<ModalKind>(null);
  const [closedGame, setClosedGame] = useState<GameRecord | null>(null);

  const session = table.session;
  const active = table.status === 'active' && !!session;

  const onToggle = () => {
    if (active) {
      Alert.alert('Закрыть стол?', 'Игра будет сохранена в статистику.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Закрыть',
          style: 'destructive',
          onPress: () => {
            const record = closeTable(table.id);
            if (record) setClosedGame(record);
          },
        },
      ]);
    } else {
      setModal('open');
    }
  };

  return (
    <Page
      footer={
        <View style={styles.footerControls}>
          <Segmented items={tableTabs} value={table.id} onChange={selectTable} />
          <BottomBar
            left={{ label: 'Статистика', onPress: () => go('stats') }}
            right={{ label: 'Настройки', onPress: () => go('settings') }}
          />
        </View>
      }
    >
      <ScreenHeader
        title="Управление столами"
        right={
          <Pressable
            onPress={() => go('tv')}
            hitSlop={8}
            style={({ focused, pressed }) => [
              styles.tvBtn,
              focused && focusFill,
              focused && focusRing,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="tv" size={16} color={colors.textMuted} />
            <Text style={styles.tvBtnText}>ТВ</Text>
          </Pressable>
        }
      />

      <Card style={{ marginTop: sp(2) }}>
        {active && session ? (
          <ActiveCard session={session} now={now} />
        ) : (
          <FreeCard />
        )}
      </Card>

      {/* 2x2 сетка управления */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <SquareButton
            icon={active ? 'trash-2' : 'play'}
            label={active ? 'Закрыть стол' : 'Открыть игру'}
            variant={active ? 'danger' : 'default'}
            showIcon={false}
            onPress={onToggle}
          />
          <SquareButton
            icon="clock"
            label="Добавить время"
            disabled={!active}
            showIcon={false}
            onPress={() => setModal('time')}
          />
        </View>
        <View style={styles.gridRow}>
          <SquareButton
            icon="coffee"
            label="Добавить напитки"
            disabled={!active}
            showIcon={false}
            onPress={() => setModal('drinks')}
          />
          <SquareButton
            icon="edit-2"
            label="Редактировать"
            disabled={!active}
            showIcon={false}
            onPress={() => setModal('edit')}
          />
        </View>
      </View>

      {/* Модалки */}
      <OpenTableModal
        visible={modal === 'open'}
        tableId={table.id}
        tableName={table.name}
        onClose={() => setModal(null)}
      />
      <AddTimeModal
        visible={modal === 'time'}
        onClose={() => setModal(null)}
        onAdd={(minutes) => useStore.getState().addTime(table.id, minutes)}
      />
      <AddDrinksModal
        visible={modal === 'drinks'}
        tableId={table.id}
        onClose={() => setModal(null)}
      />
      <EditSessionModal
        visible={modal === 'edit'}
        tableId={table.id}
        onClose={() => setModal(null)}
        onCanceled={(record) => {
          setModal(null);
          setClosedGame(record);
        }}
      />
      <GameDetailModal game={closedGame} onClose={() => setClosedGame(null)} />
    </Page>
  );
}

/* ------------------------------ карточка стола ----------------------------- */

function ActiveCard({
  session,
  now,
}: {
  session: NonNullable<ReturnType<typeof useSelectedTable>['session']>;
  now: number;
}) {
  return (
    <View>
      {/* Статус + таймер */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Статус</Text>
          <Text style={styles.statusOpen}>Открыт</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.label}>Осталось</Text>
          <CountdownText session={session} now={now} style={styles.timer} baseColor={colors.text} />
        </View>
      </View>

      <Divider />
      <DetailRow
        label="Тариф"
        value={`${session.tariffName} — ${money(session.pricePerHour)}/час`}
      />
      <Divider />
      <DetailRow label="Сумма" value={money(sessionTotal(session))} valueStrong />
      <Divider />

      <View style={styles.drinksRow}>
        <Text style={styles.label}>Напитки</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {session.drinks.length === 0 ? (
            <Text style={styles.drinkLineMuted}>—</Text>
          ) : (
            session.drinks.map((d) => (
              <Text key={d.drinkId} style={styles.drinkLine}>
                {d.name} — {d.quantity} × {money(d.price)}
              </Text>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

function FreeCard() {
  return (
    <View style={{ paddingVertical: sp(2) }}>
      <Text style={styles.label}>Статус</Text>
      <Text style={styles.statusFree}>Свободен</Text>
      <Text style={styles.freeHint}>Откройте игру, чтобы начать отсчёт.</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueStrong,
}: {
  label: string;
  value: string;
  valueStrong?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueStrong && styles.valueStrong]}>{value}</Text>
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  footerControls: { gap: sp(3) },
  tvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(1.5),
    paddingHorizontal: sp(3),
    paddingVertical: sp(1.5),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tvBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: sp(1.5) },
  statusOpen: { fontSize: 22, fontWeight: '700', color: colors.green },
  statusFree: { fontSize: 22, fontWeight: '700', color: colors.text },
  freeHint: { fontSize: 14, color: colors.textMuted, marginTop: sp(2) },
  timer: { fontSize: 26, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: sp(3.5) },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontSize: 15, color: colors.text, fontWeight: '500', textAlign: 'right', flexShrink: 1 },
  valueStrong: { fontSize: 22, fontWeight: '700' },

  drinksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  drinkLine: { fontSize: 15, color: colors.text, fontWeight: '500', marginBottom: 2 },
  drinkLineMuted: { fontSize: 15, color: colors.textMuted },

  grid: { marginTop: sp(4), gap: sp(4) },
  gridRow: { flexDirection: 'row', gap: sp(4) },
});
