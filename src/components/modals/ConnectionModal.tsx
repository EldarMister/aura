import * as Network from 'expo-network';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal, Segmented } from '@/components/ui';
import { CLOUD_SYNC_ROOM, CLOUD_SYNC_URL, hasCloudEnv } from '@/config/syncConfig';
import { LAN_PORT } from '@/lib/lanTransport';
import { colors, radius, sp } from '@/theme';
import { ConnMode, ConnStatus, DeviceRole } from '@/types';
import { useStore } from '@/store/useStore';

const MODES: { key: ConnMode; label: string }[] = [
  { key: 'off', label: 'Выкл' },
  { key: 'cloud', label: 'Облако' },
  { key: 'lan', label: 'Локально' },
];

const ROLES: { key: DeviceRole; label: string }[] = [
  { key: 'controller', label: 'Пульт' },
  { key: 'display', label: 'Табло' },
];

const STATUS: Record<ConnStatus, { text: string; color: string }> = {
  idle: { text: 'Не подключено', color: colors.textMuted },
  connecting: { text: 'Подключение…', color: colors.amber },
  connected: { text: 'На связи', color: colors.green },
  error: { text: 'Ошибка подключения', color: colors.danger },
};

export function ConnectionModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const connection = useStore((s) => s.connection);
  const connStatus = useStore((s) => s.connStatus);
  const setConnection = useStore((s) => s.setConnection);
  const [localIp, setLocalIp] = useState('');

  const status = connection.mode === 'off' ? STATUS.idle : STATUS[connStatus];

  useEffect(() => {
    let alive = true;
    if (visible && connection.mode === 'lan' && connection.role === 'display') {
      Network.getIpAddressAsync()
        .then((ip) => {
          if (alive) setLocalIp(ip && ip !== '0.0.0.0' ? ip : '');
        })
        .catch(() => {
          if (alive) setLocalIp('');
        });
    }
    return () => {
      alive = false;
    };
  }, [visible, connection.mode, connection.role]);

  return (
    <AppModal visible={visible} title="Связь с ТВ" onClose={onClose}>
      <View style={{ gap: sp(5) }}>
        {/* статус */}
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>

        {/* режим */}
        <Field label="Режим">
          <Segmented
            items={MODES}
            value={connection.mode}
            onChange={(mode) => setConnection({ mode })}
          />
        </Field>

        {connection.mode !== 'off' && (
          <>
            {/* роль */}
            <Field label="Это устройство">
              <Segmented
                items={ROLES}
                value={connection.role}
                onChange={(role) => setConnection({ role })}
              />
              <Text style={styles.hint}>
                {connection.role === 'controller'
                  ? 'Пульт — управляет столами (телефон).'
                  : 'Табло — показывает столы (ТВ).'}
              </Text>
            </Field>

            {connection.mode === 'cloud' && hasCloudEnv && (
              <Field label="Облако">
                <View style={styles.envBox}>
                  <Text style={styles.envText}>Настроено в .env</Text>
                  <Text style={styles.envSub} numberOfLines={1}>
                    {CLOUD_SYNC_URL}
                  </Text>
                  <Text style={styles.envSub}>Код: {CLOUD_SYNC_ROOM}</Text>
                </View>
              </Field>
            )}

            {connection.mode === 'cloud' && !hasCloudEnv && (
              <Field label="Код заведения">
                <TextInput
                  value={connection.room}
                  onChangeText={(room) => setConnection({ room })}
                  autoCapitalize="none"
                  placeholder="например, club-1"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.hint}>Одинаковый на пульте и табло.</Text>
              </Field>
            )}

            {connection.mode === 'cloud' && !hasCloudEnv ? (
              <Field label="Адрес сервера (облако)">
                <TextInput
                  value={connection.cloudUrl}
                  onChangeText={(cloudUrl) => setConnection({ cloudUrl })}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://ваш-сервис.onrender.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </Field>
            ) : connection.mode === 'lan' && connection.role === 'controller' ? (
              <Field label="IP телевизора">
                <TextInput
                  value={connection.lanHost}
                  onChangeText={(lanHost) => setConnection({ lanHost: lanHost.trim() })}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numeric"
                  placeholder="192.168.0.10"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.hint}>
                  Введите IP, который показан на экране ТВ. Порт {LAN_PORT} используется автоматически.
                </Text>
              </Field>
            ) : connection.mode === 'lan' ? (
              <Field label="IP этого ТВ">
                <View style={styles.ipBox}>
                  <Text style={styles.ipText}>{localIp || 'Определяется...'}</Text>
                </View>
                <Text style={styles.hint}>
                  Откройте это приложение на ТВ, включите локальный режим и введите этот IP на телефоне.
                </Text>
              </Field>
            ) : null}
          </>
        )}
      </View>
    </AppModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: sp(2) },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '600' },

  label: { fontSize: 13, color: colors.textMuted, marginBottom: sp(2) },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: sp(2) },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(4),
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  ipBox: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sp(4),
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  ipText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  envBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: sp(4),
    backgroundColor: colors.white,
    gap: 3,
  },
  envText: { fontSize: 15, color: colors.text, fontWeight: '700' },
  envSub: { fontSize: 12, color: colors.textMuted },
});
