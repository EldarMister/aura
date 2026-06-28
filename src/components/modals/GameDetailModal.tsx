import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppModal } from '@/components/ui';
import { colors, radius, sp } from '@/theme';
import { GameRecord } from '@/types';
import { dateTime, duration, gameNo, money } from '@/utils/format';

/** Подробная карточка завершённой игры (по референсу: таблица + напитки + итог). */
export function GameDetailModal({
  game,
  onClose,
}: {
  game: GameRecord | null;
  onClose: () => void;
}) {
  return (
    <AppModal
      visible={game !== null}
      title={game ? `Игра ${gameNo(game.number)}` : ''}
      onClose={onClose}
    >
      {game && (
        <View>
          {/* Информация */}
          <Text style={styles.section}>Информация</Text>
          <View style={styles.table}>
            <View style={styles.tRow}>
              <Cell
                label="Статус"
                value={
                  <Badge
                    text={game.status === 'canceled' ? 'Отменена' : 'Завершена'}
                    canceled={game.status === 'canceled'}
                  />
                }
              />
              <Cell label="Стол" value={<Val text={game.tableName} />} borderLeft />
            </View>
            <View style={[styles.tRow, styles.tRowBorder]}>
              <Cell label="Дата" value={<Val text={dateTime(game.endedAt)} />} />
              <Cell label="Тариф" value={<Val text={game.tariffName} />} borderLeft />
            </View>
            <View style={[styles.tRow, styles.tRowBorder]}>
              <Cell label="Время" value={<Val text={duration(game.durationMinutes)} />} />
              <Cell label="Сумма" value={<Val text={money(game.totalAmount)} />} borderLeft />
            </View>
          </View>

          {/* Напитки */}
          <View style={styles.drinksHead}>
            <Text style={styles.section}>Напитки</Text>
            <Text style={styles.posCount}>{game.drinks.length} поз.</Text>
          </View>

          <View style={styles.card}>
            {game.drinks.length === 0 ? (
              <Text style={styles.noDrinks}>Напитков нет</Text>
            ) : (
              game.drinks.map((d, i) => (
                <View key={d.drinkId} style={[styles.drinkRow, i > 0 && styles.drinkDivider]}>
                  <Text style={styles.drinkName}>
                    {d.quantity}× {d.name}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.drinkPrice}>
                      {game.status === 'canceled' ? money(0) : money(d.total ?? d.price * d.quantity)}
                    </Text>
                    <Text style={styles.sold}>
                      {game.status === 'canceled' ? 'Отменено' : 'Продано'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Итого */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Итого</Text>
            <Text style={styles.totalValue}>{money(game.totalAmount)}</Text>
          </View>
        </View>
      )}
    </AppModal>
  );
}

function Cell({
  label,
  value,
  borderLeft,
}: {
  label: string;
  value: React.ReactNode;
  borderLeft?: boolean;
}) {
  return (
    <View style={[styles.cell, borderLeft && styles.cellBorder]}>
      <Text style={styles.cellLabel}>{label}</Text>
      {value}
    </View>
  );
}

const Val = ({ text }: { text: string }) => (
  <Text style={styles.cellValue} numberOfLines={1}>
    {text}
  </Text>
);

const Badge = ({ text, canceled }: { text: string; canceled?: boolean }) => (
  <View style={[styles.badge, canceled && styles.badgeCanceled]}>
    <Text style={[styles.badgeText, canceled && styles.badgeTextCanceled]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: sp(3) },

  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: sp(6),
  },
  tRow: { flexDirection: 'row' },
  tRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  cell: {
    flex: 1,
    paddingVertical: sp(3),
    paddingHorizontal: sp(3.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp(2),
    minHeight: 52,
  },
  cellBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  cellLabel: { fontSize: 13, color: colors.textMuted },
  cellValue: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },

  badge: {
    backgroundColor: colors.greenSoft,
    paddingHorizontal: sp(2.5),
    paddingVertical: sp(1),
    borderRadius: radius.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.green },
  badgeCanceled: { backgroundColor: colors.bg },
  badgeTextCanceled: { color: colors.textMuted },

  drinksHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posCount: { fontSize: 13, color: colors.textMuted, marginBottom: sp(3) },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: sp(4),
  },
  noDrinks: { fontSize: 14, color: colors.textMuted, paddingVertical: sp(4), textAlign: 'center' },

  drinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3),
  },
  drinkDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  drinkName: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1, paddingRight: sp(3) },
  drinkPrice: { fontSize: 15, fontWeight: '600', color: colors.text },
  sold: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(5),
    paddingTop: sp(4),
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.text },
});
