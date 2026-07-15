import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { AppModal, PrimaryButton } from '@/components/ui';
import { colors, focusRing, radius, sp } from '@/theme';
import { money } from '@/utils/format';
import { useStore } from '@/store/useStore';

/** Открытие стола: выбираем тариф, дальше идёт простой счётчик времени. */
export function OpenTableModal({
  visible,
  tableId,
  tableName,
  onClose,
}: {
  visible: boolean;
  tableId: string;
  tableName: string;
  onClose: () => void;
}) {
  const tariffs = useStore((s) => s.tariffs);
  const openGame = useStore((s) => s.openGame);
  const [tariffId, setTariffId] = useState<string>(tariffs[0]?.id ?? '');

  useEffect(() => {
    if (visible) setTariffId(tariffs[0]?.id ?? '');
  }, [visible, tariffs]);

  const open = () => {
    if (!tariffId) return;
    openGame(tableId, tariffId);
    onClose();
  };

  return (
    <AppModal visible={visible} title={`Открыть ${tableName.toLowerCase()}`} onClose={onClose}>
      <Text style={styles.section}>Выберите тариф</Text>
      <View style={styles.tariffGrid}>
        {tariffs.map((t) => {
          const active = t.id === tariffId;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTariffId(t.id)}
              style={({ focused, pressed }) => [
                styles.tariff,
                tariffs.length > 1 && styles.tariffHalf,
                active && styles.tariffActive,
                focused && focusRing,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View>
                <Text style={styles.tariffName}>{t.name}</Text>
                <Text style={styles.tariffPrice}>{money(t.pricePerHour)}/час</Text>
              </View>
              {active ? (
                <View style={styles.check}>
                  <Feather name="check" size={16} color={colors.white} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>Счётчик и сумма начнут идти сразу после открытия.</Text>

      <View style={{ marginTop: sp(6) }}>
        <PrimaryButton label="Открыть стол" onPress={open} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: sp(3) },

  tariff: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(4),
    paddingHorizontal: sp(4),
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tariffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2.5) },
  tariffHalf: { width: '48.5%', flexGrow: 1 },
  tariffActive: { borderColor: colors.green },
  tariffName: { fontSize: 17, fontWeight: '700', color: colors.text },
  tariffPrice: { fontSize: 14, color: colors.textMuted, marginTop: 3 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 14, color: colors.textMuted, marginTop: sp(4), lineHeight: 20 },
});
