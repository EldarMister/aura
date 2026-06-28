import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppModal, PrimaryButton, Stepper } from '@/components/ui';
import { colors, sp } from '@/theme';
import { money } from '@/utils/format';
import { useStore } from '@/store/useStore';

/** Добавление напитков в текущую сессию стола. */
export function AddDrinksModal({
  visible,
  tableId,
  onClose,
}: {
  visible: boolean;
  tableId: string;
  onClose: () => void;
}) {
  const drinks = useStore((s) => s.drinks);
  const table = useStore((s) => s.tables.find((t) => t.id === tableId));
  const setDrinkQty = useStore((s) => s.setDrinkQty);

  const qtyOf = (drinkId: string) =>
    table?.session?.drinks.find((d) => d.drinkId === drinkId)?.quantity ?? 0;

  return (
    <AppModal visible={visible} title="Напитки" onClose={onClose}>
      <View>
        {drinks.map((d, i) => (
          <View key={d.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{d.name}</Text>
              <Text style={styles.price}>{money(d.price)}</Text>
            </View>
            <Stepper value={qtyOf(d.id)} onChange={(q) => setDrinkQty(tableId, d, q)} />
          </View>
        ))}
        {drinks.length === 0 && (
          <Text style={styles.empty}>Список напитков пуст. Добавьте их в настройках.</Text>
        )}
      </View>
      <View style={{ marginTop: sp(4) }}>
        <PrimaryButton label="Готово" onPress={onClose} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3.5),
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  price: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: sp(4) },
});
