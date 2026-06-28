import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { colors, focusFill, focusRing, radius, shadow, sp } from '@/theme';

type IconName = keyof typeof Feather.glyphMap;

/* -------------------------------- Card ------------------------------------ */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------ ScreenHeader ------------------------------ */

export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {right ?? null}
    </View>
  );
}

/* ------------------------------- Segmented -------------------------------- */

export interface SegItem<T extends string> {
  key: T;
  label: string;
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: SegItem<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segRow}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ focused, pressed }) => [
              styles.segItem,
              active ? styles.segItemActive : styles.segItemIdle,
              focused && focusRing,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segText, active ? styles.segTextActive : styles.segTextIdle]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------ SquareButton ------------------------------ */

export function SquareButton({
  icon,
  label,
  onPress,
  variant = 'default',
  disabled,
  showIcon = true,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  showIcon?: boolean;
}) {
  const tint =
    disabled ? colors.textMuted : variant === 'danger' ? colors.text : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ focused, pressed }) => [
        styles.square,
        focused && focusRing,
        pressed && !disabled && styles.pressed,
        disabled && styles.squareDisabled,
      ]}
    >
      {showIcon ? <Feather name={icon} size={26} color={tint} /> : null}
      <Text style={[styles.squareLabel, disabled && { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------- BottomBar -------------------------------- */

type BottomBtn = { label: string; onPress: () => void; icon?: IconName };

export function BottomBar({ left, right }: { left: BottomBtn; right: BottomBtn }) {
  return (
    <View style={styles.bottomBar}>
      {[left, right].map((b, i) => (
        <Pressable
          key={i}
          onPress={b.onPress}
          style={({ focused, pressed }) => [
            styles.bottomBtn,
            focused && focusRing,
            pressed && styles.pressed,
          ]}
        >
          {b.icon ? <Feather name={b.icon} size={18} color={colors.text} /> : null}
          <Text style={styles.bottomBtnText}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ----------------------------- OutlineButton ------------------------------ */

export function OutlineButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ focused, pressed }) => [
        styles.outlineBtn,
        focused && focusRing,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ----------------------------- PrimaryButton ------------------------------ */

export function PrimaryButton({
  label,
  onPress,
  variant = 'green',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'green' | 'danger' | 'ghost';
  style?: ViewStyle;
}) {
  const bg =
    variant === 'green' ? colors.green : variant === 'danger' ? colors.danger : colors.white;
  const fg = variant === 'ghost' ? colors.text : colors.white;
  return (
    <Pressable
      onPress={onPress}
      style={({ focused, pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        focused && focusRing,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.primaryBtnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------- Stepper --------------------------------- */

export function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        style={({ focused, pressed }) => [
          styles.stepBtn,
          focused && focusRing,
          pressed && styles.pressed,
        ]}
      >
        <Feather name="minus" size={18} color={value > 0 ? colors.text : colors.textMuted} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        style={({ focused, pressed }) => [
          styles.stepBtn,
          focused && focusRing,
          pressed && styles.pressed,
        ]}
      >
        <Feather name="plus" size={18} color={colors.green} />
      </Pressable>
    </View>
  );
}

/* -------------------------------- AppModal -------------------------------- */

export function AppModal({
  visible,
  title,
  onClose,
  children,
  scrollbar = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  scrollbar?: boolean;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable focusable={false} style={styles.backdrop} onPress={onClose}>
        <Pressable focusable={false} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ focused, pressed }) => [
                styles.sheetClose,
                focused && focusFill,
                focused && focusRing,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="x" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: height * 0.82 }}
            contentContainerStyle={{ paddingBottom: sp(1) }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={scrollbar}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: sp(4),
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: sp(2),
    paddingBottom: sp(4),
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: 0.2 },

  segRow: { flexDirection: 'row', gap: sp(3) },
  segItem: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segItemActive: { backgroundColor: colors.green },
  segItemIdle: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  segText: { fontSize: 15, fontWeight: '600' },
  segTextActive: { color: colors.white },
  segTextIdle: { color: colors.text },

  square: {
    flex: 1,
    aspectRatio: 1.12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2.5),
    ...shadow,
  },
  squareDisabled: { opacity: 0.55 },
  squareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: sp(2),
  },

  bottomBar: { flexDirection: 'row', gap: sp(3) },
  bottomBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: sp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },

  outlineBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: colors.green },

  primaryBtn: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: sp(3) },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  stepValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  pressed: { opacity: 0.6 },

  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    paddingHorizontal: sp(5),
    paddingTop: sp(3),
    paddingBottom: sp(8),
    borderTopWidth: 1,
    borderColor: colors.border,
    // лёгкая тень-подъём вместо затемнения фона
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: sp(3),
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(3),
  },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
  sheetClose: { padding: sp(1) },
});
