import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { GameRow } from '@/components/GameRow';
import { AppModal } from '@/components/ui';
import { colors, sp } from '@/theme';
import { GameRecord, StatsPeriod } from '@/types';

const PERIOD_TITLE: Record<StatsPeriod, string> = {
  day: 'Все игры за день',
  week: 'Все игры за неделю',
  month: 'Все игры за месяц',
};

/** Полный список игр за период (по референсу — карточки + scrollbar). */
export function AllGamesModal({
  visible,
  period,
  games,
  onClose,
  onOpenGame,
}: {
  visible: boolean;
  period: StatsPeriod;
  games: GameRecord[];
  onClose: () => void;
  onOpenGame: (game: GameRecord) => void;
}) {
  return (
    <AppModal visible={visible} title={PERIOD_TITLE[period]} onClose={onClose} scrollbar>
      {games.length === 0 ? (
        <Text style={styles.empty}>За этот период игр нет.</Text>
      ) : (
        games.map((g) => (
          <GameRow key={g.id} game={g} card onPress={() => onOpenGame(g)} />
        ))
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, color: colors.textMuted, paddingVertical: sp(6), textAlign: 'center' },
});
