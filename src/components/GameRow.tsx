import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { colors, focusFill, focusRing, radius, sp } from '@/theme';
import { GameRecord } from '@/types';
import { duration, gameNo, hhmm, money } from '@/utils/format';

/**
 * Строка одной игры. Используется в блоке «Все игры» (plain) и в модалке
 * «Смотреть все» (card). По нажатию открывает подробную карточку.
 */
export function GameRow({
  game,
  card = false,
  onPress,
}: {
  game: GameRecord;
  card?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ focused, pressed }) => [
        styles.row,
        card && styles.card,
        focused && focusFill,
        focused && focusRing,
        pressed && onPress ? { opacity: 0.6 } : null,
      ]}
    >
      <View style={{ flex: 1, paddingRight: sp(3) }}>
        <Text style={styles.title} numberOfLines={1}>
          {gameNo(game.number)} — {hhmm(game.endedAt)} — {game.tableName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {game.status === 'canceled' ? 'Отменено' : game.tariffName} / {duration(game.durationMinutes)}
        </Text>
      </View>
      <Text style={[styles.amount, game.status === 'canceled' && styles.canceled]}>
        {game.status === 'canceled' ? 'Отменено' : money(game.totalAmount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(2.5),
    borderRadius: radius.md,
  },
  card: {
    paddingVertical: sp(3.5),
    paddingHorizontal: sp(4),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: sp(3),
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.green },
  canceled: { color: colors.textMuted, fontSize: 13 },
});
