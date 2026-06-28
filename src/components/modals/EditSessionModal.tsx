import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal, PrimaryButton, Stepper } from '@/components/ui';
import { colors, radius, sp } from '@/theme';
import { money } from '@/utils/format';
import { useStore } from '@/store/useStore';

const QUICK = [15, 30, 60];

/** Редактирование текущей сессии: тариф, время, напитки + закрытие стола. */
export function EditSessionModal({
  visible,
  tableId,
  onClose,
}: {
  visible: boolean;
  tableId: string;
  onClose: () => void;
}) {
  const table = useStore((s) => s.tables.find((t) => t.id === tableId));
  const tariffs = useStore((s) => s.tariffs);
  const drinks = useStore((s) => s.drinks);
  const changeTariff = useStore((s) => s.changeTariff);
  const addTime = useStore((s) => s.addTime);
  const resetTime = useStore((s) => s.resetTime);
  const setDrinkQty = useStore((s) => s.setDrinkQty);
  const closeTable = useStore((s) => s.closeTable);

  const session = table?.session;
  const qtyOf = (drinkId: string) =>
    session?.drinks.find((d) => d.drinkId === drinkId)?.quantity ?? 0;

  return (
    <AppModal visible={visible} title="Редактировать стол" onClose={onClose}>
      {!session ? null : (
        <View style={{ gap: sp(6) }}>
          {/* Тариф */}
          <View>
            <Text style={styles.section}>Тариф</Text>
            <View style={{ gap: sp(2.5) }}>
              {tariffs.map((t) => {
                const active = t.id === session.tariffId;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => changeTariff(tableId, t.id)}
                    style={({ pressed }) => [
                      styles.tariffRow,
                      active && styles.tariffActive,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={styles.tariffName}>
                      {t.name} — {money(t.pricePerHour)}/час
                    </Text>
                    {active ? <Feather name="check" size={18} color={colors.green} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Время */}
          <View>
            <Text style={styles.section}>Время</Text>
            <View style={styles.chips}>
              {QUICK.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => addTime(tableId, m)}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.chipText}>+{m} мин</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => resetTime(tableId)}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>Сброс</Text>
              </Pressable>
            </View>
          </View>

          {/* Напитки */}
          <View>
            <Text style={styles.section}>Напитки</Text>
            <View>
              {drinks.map((d, i) => (
                <View key={d.id} style={[styles.drinkRow, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drinkName}>{d.name}</Text>
                    <Text style={styles.drinkPrice}>{money(d.price)}</Text>
                  </View>
                  <Stepper value={qtyOf(d.id)} onChange={(q) => setDrinkQty(tableId, d, q)} />
                </View>
              ))}
            </View>
          </View>

          {/* Действия */}
          <View style={{ gap: sp(3) }}>
            <PrimaryButton
              label="Закрыть стол"
              variant="danger"
              onPress={() => {
                closeTable(tableId);
                onClose();
              }}
            />
            <PrimaryButton label="Готово" variant="ghost" onPress={onClose} />
          </View>
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, color: colors.textMuted, marginBottom: sp(3), letterSpacing: 0.3 },

  tariffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3),
    paddingHorizontal: sp(4),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tariffActive: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  tariffName: { fontSize: 15, fontWeight: '600', color: colors.text },

  chips: { flexDirection: 'row', gap: sp(2.5) },
  chip: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },

  drinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3),
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  drinkName: { fontSize: 15, fontWeight: '600', color: colors.text },
  drinkPrice: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
