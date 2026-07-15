import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { PrimaryButton } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { colors, focusFill, focusRing, radius, sp } from '@/theme';
import { GameRecord, GameSession } from '@/types';
import { money } from '@/utils/format';
import { drinksTotal, sessionTotal, timeCost } from '@/utils/session';
import { useStore } from '@/store/useStore';

/** Редактирование текущей сессии: тариф, пауза, отмена заказа. */
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
  const now = useNow();
  const table = useStore((s) => s.tables.find((t) => t.id === tableId));
  const tariffs = useStore((s) => s.tariffs);
  const updateSession = useStore((s) => s.updateSession);
  const togglePause = useStore((s) => s.togglePause);
  const cancelTable = useStore((s) => s.cancelTable);

  const session = table?.session;
  const [tariffId, setTariffId] = useState('');

  useEffect(() => {
    if (!visible || !session) return;
    setTariffId(session.tariffId);
  }, [visible, session]);

  const selectedTariff = tariffs.find((t) => t.id === tariffId);
  const draftSession = useMemo<GameSession | null>(() => {
    if (!session || !selectedTariff) return null;
    return {
      ...session,
      tariffId: selectedTariff.id,
      tariffName: selectedTariff.name,
      pricePerHour: selectedTariff.pricePerHour,
    };
  }, [selectedTariff, session]);

  const apply = () => {
    if (!draftSession) return;
    updateSession(tableId, draftSession.tariffId);
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
                <Text style={styles.section}>Управление</Text>
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

              <View>
                <Text style={styles.section}>Подытог</Text>
                <View style={styles.summary}>
                  <SummaryRow label="Время" value={money(timeCost(draftSession, now))} />
                  <SummaryRow label="Напитки" value={money(drinksTotal(draftSession))} />
                  <View style={styles.summaryDivider} />
                  <SummaryRow label="Итого" value={money(sessionTotal(draftSession, now))} strong />
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
  content: { padding: sp(5), gap: sp(4), paddingBottom: sp(5) },
  actionsRow: {
    flexDirection: 'row',
    gap: sp(3),
  },
  actionBtn: { flex: 1 },
  section: { fontSize: 13, color: colors.textMuted, marginBottom: sp(3), letterSpacing: 0.3 },
  pauseBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(1.5),
    backgroundColor: colors.white,
  },
  pauseBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  pauseText: { fontSize: 14, fontWeight: '700', color: colors.text },
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
