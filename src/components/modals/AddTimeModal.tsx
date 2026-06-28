import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { AppModal, PrimaryButton } from '@/components/ui';
import { colors, focusRing, radius, sp } from '@/theme';

const QUICK = [15, 30, 60];

export function AddTimeModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (minutes: number) => void;
}) {
  const [custom, setCustom] = useState('');

  const apply = (minutes: number) => {
    if (minutes > 0) onAdd(minutes);
    setCustom('');
    onClose();
  };

  return (
    <AppModal visible={visible} title="Добавить время" onClose={onClose}>
      <View style={styles.chips}>
        {QUICK.map((m) => (
          <Pressable
            key={m}
            onPress={() => apply(m)}
            style={({ focused, pressed }) => [
              styles.chip,
              focused && focusRing,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.chipText}>+{m} мин</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Своё значение, мин</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={custom}
          onChangeText={(v) => setCustom(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Добавить" onPress={() => apply(parseInt(custom || '0', 10))} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: sp(3) },
  chip: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, color: colors.textMuted, marginTop: sp(5), marginBottom: sp(2) },
  inputRow: { flexDirection: 'row', gap: sp(3), alignItems: 'center' },
  input: {
    width: 90,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(4),
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
