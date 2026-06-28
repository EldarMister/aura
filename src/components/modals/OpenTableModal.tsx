import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal, PrimaryButton } from '@/components/ui';
import { colors, radius, sp } from '@/theme';
import { money } from '@/utils/format';
import { useStore } from '@/store/useStore';

const STEP_MIN = 10;
const PRESETS: { label: string; minutes: number }[] = [
  { label: '30 минут', minutes: 30 },
  { label: '1 час', minutes: 60 },
  { label: '2 часа', minutes: 120 },
  { label: '3 часа', minutes: 180 },
];

/**
 * Открытие стола: выбор тарифа + ввод времени. Время идёт обратным отсчётом,
 * поэтому здесь задаётся длительность брони. Раскладка по референсу.
 */
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
  // Часы и минуты — строки, чтобы поле можно было свободно очищать и вводить.
  const [hStr, setHStr] = useState('1');
  const [mStr, setMStr] = useState('0');

  useEffect(() => {
    if (visible) {
      setTariffId(tariffs[0]?.id ?? '');
      setHStr('1');
      setMStr('0');
    }
  }, [visible, tariffs]);

  const hours = parseInt(hStr || '0', 10) || 0;
  const mins = parseInt(mStr || '0', 10) || 0;
  const minutes = hours * 60 + mins;

  const setFromTotal = (total: number) => {
    const t = Math.max(0, total);
    setHStr(String(Math.floor(t / 60)));
    setMStr(String(t % 60));
  };

  const onHours = (v: string) => setHStr(v.replace(/[^0-9]/g, '').slice(0, 2));
  const onMins = (v: string) => {
    let d = v.replace(/[^0-9]/g, '').slice(0, 2);
    if (d !== '' && parseInt(d, 10) > 59) d = '59';
    setMStr(d);
  };

  const open = () => {
    if (!tariffId || minutes <= 0) return;
    openGame(tableId, tariffId, minutes * 60);
    onClose();
  };

  return (
    <AppModal visible={visible} title={`Открыть ${tableName.toLowerCase()}`} onClose={onClose}>
      <Text style={styles.section}>Выберите тариф</Text>
      <View style={{ gap: sp(2.5) }}>
        {tariffs.map((t) => {
          const active = t.id === tariffId;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTariffId(t.id)}
              style={({ pressed }) => [
                styles.tariff,
                active && styles.tariffActive,
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

      <Text style={[styles.section, { marginTop: sp(6) }]}>Выберите время</Text>

      <View style={styles.timeRow}>
        <Pressable
          onPress={() => setFromTotal(minutes - STEP_MIN)}
          style={({ pressed }) => [styles.stepBox, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.stepText}>− {STEP_MIN} мин</Text>
        </Pressable>

        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>Часы</Text>
          <TextInput
            value={hStr}
            onChangeText={onHours}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.valueInput}
          />
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>Минуты</Text>
          <TextInput
            value={mStr}
            onChangeText={onMins}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.valueInput}
          />
        </View>

        <Pressable
          onPress={() => setFromTotal(minutes + STEP_MIN)}
          style={({ pressed }) => [styles.stepBox, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.stepText}>+ {STEP_MIN} мин</Text>
        </Pressable>
      </View>

      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const active = p.minutes === minutes;
          return (
            <Pressable
              key={p.label}
              onPress={() => setFromTotal(p.minutes)}
              style={({ pressed }) => [
                styles.preset,
                active && styles.presetActive,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: sp(6) }}>
        <PrimaryButton label="Открыть стол" onPress={open} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: sp(3) },

  tariff: {
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

  timeRow: { flexDirection: 'row', gap: sp(2.5) },
  stepBox: {
    flex: 1,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 15, fontWeight: '700', color: colors.green },
  valueBox: {
    flex: 1,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  valueLabel: { fontSize: 12, color: colors.textMuted },
  valueInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    minWidth: 48,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  presets: { flexDirection: 'row', gap: sp(2.5), marginTop: sp(3) },
  preset: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  presetText: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  presetTextActive: { color: colors.green },
});
