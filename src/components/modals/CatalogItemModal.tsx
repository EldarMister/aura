import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal, PrimaryButton } from '@/components/ui';
import { colors, radius, sp } from '@/theme';

export interface CatalogDraft {
  id?: string;
  name: string;
  price: number;
}

/** Универсальный редактор справочника: напиток или тариф. */
export function CatalogItemModal({
  visible,
  kind,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  kind: 'drink' | 'tariff';
  initial: CatalogDraft | null; // null => создание
  onClose: () => void;
  onSave: (draft: CatalogDraft) => void;
  onDelete?: (id: string) => void;
}) {
  const isTariff = kind === 'tariff';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial ? String(initial.price) : '');
    }
  }, [visible, initial]);

  const title = initial
    ? isTariff
      ? 'Тариф'
      : 'Напиток'
    : isTariff
      ? 'Новый тариф'
      : 'Новый напиток';

  const save = () => {
    const trimmed = name.trim();
    const value = parseInt(price || '0', 10);
    if (!trimmed || value <= 0) return;
    onSave({ id: initial?.id, name: trimmed, price: value });
    onClose();
  };

  return (
    <AppModal visible={visible} title={title} onClose={onClose}>
      <View style={{ gap: sp(4) }}>
        <View>
          <Text style={styles.label}>Название</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={isTariff ? 'Например, Стандартный' : 'Например, Кола'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View>
          <Text style={styles.label}>{isTariff ? 'Цена за час, с' : 'Цена, с'}</Text>
          <TextInput
            value={price}
            onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={{ gap: sp(3), marginTop: sp(1) }}>
          <PrimaryButton label="Сохранить" onPress={save} />
          {initial?.id && onDelete ? (
            <PrimaryButton
              label="Удалить"
              variant="danger"
              onPress={() => {
                onDelete(initial.id!);
                onClose();
              }}
            />
          ) : null}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textMuted, marginBottom: sp(2) },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(4),
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
});
