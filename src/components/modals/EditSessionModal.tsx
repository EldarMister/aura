import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { PrimaryButton } from '@/components/ui';
import { colors, focusFill, focusRing, radius, sp } from '@/theme';
import { GameRecord, GameSession } from '@/types';
import { money } from '@/utils/format';
import { drinksTotal, sessionTotal, timeCost } from '@/utils/session';
import { useStore } from '@/store/useStore';

const STEP_MIN = 10;
const QUICK = [-30, -15, 15, 30];

/** Редактирование текущей сессии через черновик: применяем только по "Готово". */
export function EditSessionModal({
  visible,
  tableId,
  onClose,
  onCanceled,
}: {
  visible: boolean;
  tableId: string;
  onClose: () => void;
  onCanceled?: (record: GameRecord) => void;
}) {
  const table = useStore((s) => s.tables.find((t) => t.id === tableId));
  const tariffs = useStore((s) => s.tariffs);
  const updateSession = useStore((s) => s.updateSession);
  const togglePause = useStore((s) => s.togglePause);
  const cancelTable = useStore((s) => s.cancelTable);

  const session = table?.session;
  const [tariffId, setTariffId] = useState('');
  const [hStr, setHStr] = useState('0');
  const [mStr, setMStr] = useState('0');

  useEffect(() => {
    if (!visible || !session) return;
    // По умолчанию показываем исходную бронь (целые минуты), а не остаток отсчёта.
    const total = Math.max(0, Math.round(session.durationSeconds / 60));
    setTariffId(session.tariffId);
    setHStr(String(Math.floor(total / 60)));
    setMStr(String(total % 60));
  }, [visible, session]);

  const hours = parseInt(hStr || '0', 10) || 0;
  const mins = parseInt(mStr || '0', 10) || 0;
  const minutes = hours * 60 + mins;
  const selectedTariff = tariffs.find((t) => t.id === tariffId);

  const draftSession = useMemo<GameSession | null>(() => {
    if (!session || !selectedTariff) return null;
    return {
      ...session,
      tariffId: selectedTariff.id,
      tariffName: selectedTariff.name,
      pricePerHour: selectedTariff.pricePerHour,
      durationSeconds: Math.max(0, minutes * 60),
    };
  }, [minutes, selectedTariff, session]);

  const setFromTotal = (total: number) => {
    const t = Math.max(0, Math.round(total));
    setHStr(String(Math.floor(t / 60)));
    setMStr(String(t % 60));
  };

  const onHours = (v: string) => setHStr(v.replace(/[^0-9]/g, '').slice(0, 2));
  const onMins = (v: string) => {
    let d = v.replace(/[^0-9]/g, '').slice(0, 2);
    if (d !== '' && parseInt(d, 10) > 59) d = '59';
    setMStr(d);
  };

  const apply = () => {
    if (!draftSession || minutes <= 0) return;
    updateSession(tableId, draftSession.tariffId, draftSession.durationSeconds);
    onClose();
  };

  const cancelOrder = () => {
    const record = cancelTable(tableId);
    if (record) onCanceled?.(record);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Редактировать стол</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ focused, pressed }) => [
                styles.closeBtn,
                focused && focusFill,
                focused && focusRing,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Feather name="x" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {!session || !draftSession ? null : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {tariffs.length > 1 ? (
                <View>
                  <Text style={styles.section}>Тариф</Text>
                  <View style={styles.tariffGrid}>
                    {tariffs.map((t) => {
                      const active = t.id === tariffId;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => setTariffId(t.id)}
                          style={({ focused, pressed }) => [
                            styles.tariffRow,
                            tariffs.length > 1 && styles.tariffHalf,
                            active && styles.tariffActive,
                            focused && focusRing,
                            pressed && { opacity: 0.6 },
                          ]}
                        >
                          <View style={{ flex: 1, paddingRight: sp(2) }}>
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
                </View>
              ) : null}

          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Время</Text>
              <Pressable
                onPress={() => togglePause(tableId)}
                style={({ focused, pressed }) => [
                  styles.pauseBtn,
                  session.status === 'paused' && styles.pauseBtnActive,
                  focused && focusRing,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Feather
                  name={session.status === 'paused' ? 'play' : 'pause'}
                  size={16}
                  color={session.status === 'paused' ? colors.white : colors.text}
                />
                <Text
                  style={[
                    styles.pauseText,
                    session.status === 'paused' && styles.pauseTextActive,
                  ]}
                >
                  {session.status === 'paused' ? 'Продолжить' : 'Приостановить'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.timeRow}>
              <Pressable
                onPress={() => setFromTotal(minutes - STEP_MIN)}
                style={({ focused, pressed }) => [
                  styles.stepBox,
                  focused && focusRing,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.stepText}>- {STEP_MIN} мин</Text>
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
                style={({ focused, pressed }) => [
                  styles.stepBox,
                  focused && focusRing,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.stepText}>+ {STEP_MIN} мин</Text>
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              {QUICK.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setFromTotal(minutes + m)}
                  style={({ focused, pressed }) => [
                    styles.quick,
                    m < 0 && styles.quickMinus,
                    focused && focusRing,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.quickText, m < 0 && styles.quickTextMinus]}>
                    {m > 0 ? '+' : ''}
                    {m} мин
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.section}>Подытог</Text>
            <View style={styles.summary}>
              <SummaryRow label="Время" value={money(timeCost(draftSession))} />
              <SummaryRow label="Напитки" value={money(drinksTotal(draftSession))} />
              <View style={styles.summaryDivider} />
              <SummaryRow label="Итого" value={money(sessionTotal(draftSession))} strong />
            </View>
          </View>

            <View style={styles.actionsRow}>
              <PrimaryButton label="Готово" onPress={apply} style={styles.actionBtn} />
              <PrimaryButton
                label="Отменить заказ"
                variant="danger"
                onPress={cancelOrder}
                style={styles.actionBtn}
              />
            </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    overflow: 'hidden',
  },
  header: {
    height: 58,
    paddingHorizontal: sp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { padding: sp(1), borderRadius: 999 },
  scroll: { flex: 1 },
  content: { padding: sp(5), gap: sp(4), paddingBottom: sp(5) },
  actionsRow: {
    flexDirection: 'row',
    gap: sp(3),
  },
  actionBtn: { flex: 1 },
  section: { fontSize: 13, color: colors.textMuted, marginBottom: sp(3), letterSpacing: 0.3 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(3),
  },
  pauseBtn: {
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(1.5),
    backgroundColor: colors.white,
  },
  pauseBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  pauseText: { fontSize: 13, fontWeight: '700', color: colors.text },
  pauseTextActive: { color: colors.white },

  tariffRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3),
    paddingHorizontal: sp(4),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tariffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2.5) },
  tariffHalf: { width: '48.5%', flexGrow: 1 },
  tariffActive: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  tariffName: { fontSize: 15, fontWeight: '700', color: colors.text },
  tariffPrice: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
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
  stepText: { fontSize: 14, fontWeight: '700', color: colors.green, textAlign: 'center' },
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

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2.5), marginTop: sp(3) },
  quick: {
    flexGrow: 1,
    minWidth: '22%',
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(2),
  },
  quickMinus: { borderColor: colors.danger },
  quickText: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  quickTextMinus: { color: colors.danger },

  summary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: sp(4),
    gap: sp(2.5),
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: colors.textMuted },
  summaryValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryStrong: { fontSize: 18, color: colors.text, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: colors.divider },
});
