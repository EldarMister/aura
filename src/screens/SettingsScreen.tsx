import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CatalogDraft, CatalogItemModal } from '@/components/modals/CatalogItemModal';
import { ConnectionModal } from '@/components/modals/ConnectionModal';
import { FocusablePressable as Pressable } from '@/components/FocusablePressable';
import { Page } from '@/components/Page';
import { BottomBar, Card, OutlineButton, ScreenHeader } from '@/components/ui';
import { colors, focusFill, focusRing, sp } from '@/theme';
import { ConnMode, ConnStatus, DeviceRole } from '@/types';
import { useStore } from '@/store/useStore';
import { money } from '@/utils/format';

const MODE_LABEL: Record<ConnMode, string> = {
  off: 'Выключена',
  cloud: 'Облако',
  lan: 'Локально (Wi-Fi)',
};
const ROLE_LABEL: Record<DeviceRole, string> = {
  controller: 'Пульт',
  display: 'Табло',
};
const STATUS_COLOR: Record<ConnStatus, string> = {
  idle: colors.textMuted,
  connecting: colors.amber,
  connected: colors.green,
  error: colors.danger,
};

type Editor =
  | { kind: 'drink'; initial: CatalogDraft | null }
  | { kind: 'tariff'; initial: CatalogDraft | null }
  | null;

export function SettingsScreen() {
  const drinks = useStore((s) => s.drinks);
  const tariffs = useStore((s) => s.tariffs);
  const go = useStore((s) => s.go);
  const upsertDrink = useStore((s) => s.upsertDrink);
  const removeDrink = useStore((s) => s.removeDrink);
  const upsertTariff = useStore((s) => s.upsertTariff);
  const removeTariff = useStore((s) => s.removeTariff);

  const connection = useStore((s) => s.connection);
  const connStatus = useStore((s) => s.connStatus);

  const [drinksOpen, setDrinksOpen] = useState(true);
  const [editor, setEditor] = useState<Editor>(null);
  const [connOpen, setConnOpen] = useState(false);

  const dotColor = connection.mode === 'off' ? colors.textMuted : STATUS_COLOR[connStatus];

  return (
    <Page
      footer={
        <BottomBar
          left={{ label: 'Главная', onPress: () => go('tables') }}
          right={{ label: 'Статистика', onPress: () => go('stats') }}
        />
      }
    >
      <ScreenHeader title="Настройки" />

      {/* Напитки (раскрывающийся блок) */}
      <Card style={{ marginBottom: sp(5) }}>
        <Pressable
          style={({ focused, pressed }) => [
            styles.cardHead,
            focused && focusFill,
            focused && focusRing,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => setDrinksOpen((v) => !v)}
        >
          <Text style={styles.cardTitle}>Напитки</Text>
          <Feather
            name={drinksOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>

        {drinksOpen && (
          <View style={{ marginTop: sp(2) }}>
            {drinks.map((d, i) => (
              <ItemRow
                key={d.id}
                title={`${d.name} — ${money(d.price)}`}
                divider={i > 0}
                onEdit={() => setEditor({ kind: 'drink', initial: { id: d.id, name: d.name, price: d.price } })}
              />
            ))}
            <View style={{ marginTop: sp(4) }}>
              <OutlineButton
                label="Добавить напиток"
                onPress={() => setEditor({ kind: 'drink', initial: null })}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Тарифы */}
      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Тарифы</Text>
        </View>
        <View style={{ marginTop: sp(2) }}>
          {tariffs.map((t, i) => (
            <ItemRow
              key={t.id}
              title={`${t.name} — ${money(t.pricePerHour)}/час`}
              divider={i > 0}
              onEdit={() =>
                setEditor({
                  kind: 'tariff',
                  initial: { id: t.id, name: t.name, price: t.pricePerHour },
                })
              }
            />
          ))}
          <View style={{ marginTop: sp(4) }}>
            <OutlineButton
              label="Добавить тариф"
              onPress={() => setEditor({ kind: 'tariff', initial: null })}
            />
          </View>
        </View>
      </Card>

      {/* Связь с ТВ */}
      <Card style={{ marginTop: sp(5) }}>
        <Pressable
          style={({ focused, pressed }) => [
            styles.connRow,
            focused && focusFill,
            focused && focusRing,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => setConnOpen(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Связь с ТВ</Text>
            <Text style={styles.connSub}>
              {connection.mode === 'off'
                ? 'Выключена'
                : `${MODE_LABEL[connection.mode]} · ${ROLE_LABEL[connection.role]}`}
            </Text>
          </View>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>

      <CatalogItemModal
        visible={editor !== null}
        kind={editor?.kind ?? 'drink'}
        initial={editor?.initial ?? null}
        onClose={() => setEditor(null)}
        onSave={(draft) => (editor?.kind === 'tariff'
          ? upsertTariff({ id: draft.id, name: draft.name, pricePerHour: draft.price })
          : upsertDrink(draft))}
        onDelete={(id) => (editor?.kind === 'tariff' ? removeTariff(id) : removeDrink(id))}
      />
      <ConnectionModal visible={connOpen} onClose={() => setConnOpen(false)} />
    </Page>
  );
}

function ItemRow({
  title,
  divider,
  onEdit,
}: {
  title: string;
  divider: boolean;
  onEdit: () => void;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Pressable
        onPress={onEdit}
        hitSlop={10}
        style={({ focused, pressed }) => [
          styles.editBtn,
          focused && focusFill,
          focused && focusRing,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Feather name="edit-2" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: sp(1),
    margin: -sp(1),
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(3.5),
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowTitle: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1 },
  editBtn: { padding: sp(1), borderRadius: 999 },

  connRow: { flexDirection: 'row', alignItems: 'center', gap: sp(3), borderRadius: 10 },
  connSub: { fontSize: 14, color: colors.textMuted, marginTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
