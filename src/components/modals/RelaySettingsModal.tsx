import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppModal, PrimaryButton, Segmented } from '@/components/ui';
import { normalizeRelayUrl } from '@/config/relayConfig';
import { getRelayState } from '@/lib/relay';
import { getRelaySecrets, saveRelaySecrets } from '@/lib/relaySecrets';
import { useStore } from '@/store/useStore';
import { colors, radius, sp } from '@/theme';
import type { RelayConfig, RelayMode, RelayTableId } from '@/types';

const MODES: { key: RelayMode; label: string }[] = [
  { key: 'cloud', label: 'Облако' },
  { key: 'off', label: 'Выкл' },
];

interface RelaySettingsModalProps {
  tableId: RelayTableId;
  visible: boolean;
  onClose: () => void;
}

export function RelaySettingsModal({
  tableId,
  visible,
  onClose,
}: RelaySettingsModalProps) {
  const relay = useStore((state) => state.relays[tableId]);
  const setRelay = useStore((state) => state.setRelay);
  const [draft, setDraft] = useState<RelayConfig>(relay);
  const [apiToken, setApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!visible) {
      setApiToken('');
      setShowAdvanced(false);
      return;
    }
    let alive = true;
    setDraft(relay);
    getRelaySecrets()
      .then((secrets) => {
        if (alive) setApiToken(secrets.apiToken);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [relay, visible]);

  const patch = (next: Partial<RelayConfig>) =>
    setDraft((current) => ({ ...current, ...next }));

  const normalizeAndValidate = (): RelayConfig | null => {
    if (draft.mode === 'off') return { ...draft, mode: 'off', region: 'eu' };

    const deviceId = draft.deviceId.trim();
    const cloudUrl = normalizeRelayUrl(draft.cloudUrl);
    if (!deviceId) {
      Alert.alert('Не заполнен Device ID', 'Введите идентификатор реле из Tuya.');
      return null;
    }
    if (!cloudUrl) {
      Alert.alert('Не настроено облако', 'Введите адрес сервера на Railway.');
      return null;
    }

    return {
      ...draft,
      mode: 'cloud',
      deviceId,
      region: 'eu',
      dpCode: draft.dpCode.trim() || 'switch_1',
      cloudUrl,
    };
  };

  const persist = async () => {
    const config = normalizeAndValidate();
    if (!config) return null;
    await saveRelaySecrets({ apiToken });
    setRelay(tableId, config);
    return config;
  };

  const save = async () => {
    if (saving || testing) return;
    setSaving(true);
    try {
      if (await persist()) onClose();
    } catch (error) {
      Alert.alert(
        'Не удалось сохранить настройки',
        error instanceof Error ? error.message : 'Ошибка защищённого хранилища.',
      );
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (testing || saving) return;
    setTesting(true);
    try {
      const config = await persist();
      if (!config || config.mode === 'off') return;
      const result = await getRelayState(tableId, config);
      Alert.alert('Реле на связи', result.on ? 'Свет включён' : 'Свет выключен');
    } catch (error) {
      Alert.alert(
        'Реле не отвечает',
        error instanceof Error ? error.message : 'Не удалось проверить подключение.',
      );
    } finally {
      setTesting(false);
    }
  };

  const tableNumber = tableId === 'table-1' ? '1' : '2';

  return (
    <AppModal visible={visible} title={`Реле стола ${tableNumber}`} onClose={onClose} scrollbar>
      <View style={styles.content}>
        <Field label="Управление светом">
          <Segmented items={MODES} value={draft.mode} onChange={(mode) => patch({ mode })} />
        </Field>

        {draft.mode === 'cloud' ? (
          <>
            <Field label="Device ID">
              <Input
                value={draft.deviceId}
                onChangeText={(deviceId) => patch({ deviceId })}
                placeholder="например, bf1234..."
              />
            </Field>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tuya Cloud</Text>
              <Field label="Адрес сервера на Railway">
                <Input
                  value={draft.cloudUrl}
                  onChangeText={(cloudUrl) => patch({ cloudUrl })}
                  placeholder="https://ваш-сервис.up.railway.app"
                  keyboardType="url"
                />
              </Field>
              <Field label="Токен доступа к серверу">
                <Input
                  value={apiToken}
                  onChangeText={setApiToken}
                  placeholder="значение RELAY_API_TOKEN"
                  secureTextEntry
                />
              </Field>
              <Text style={styles.hint}>
                Реле работает только через Tuya Cloud. IP и Local Key не используются.
              </Text>
            </View>

            <PrimaryButton
              label={showAdvanced ? 'Скрыть дополнительные настройки' : 'Дополнительно'}
              variant="ghost"
              disabled={saving || testing}
              onPress={() => setShowAdvanced((current) => !current)}
            />

            {showAdvanced ? (
              <View style={styles.advanced}>
                <Field label="Код включения DP">
                  <Input
                    value={draft.dpCode}
                    onChangeText={(dpCode) => patch({ dpCode })}
                    placeholder="switch_1"
                  />
                </Field>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.actions}>
          {draft.mode === 'cloud' ? (
            <PrimaryButton
              label={testing ? 'Проверяем…' : 'Проверить подключение'}
              variant="ghost"
              disabled={testing || saving}
              onPress={() => void testConnection()}
            />
          ) : null}
          <PrimaryButton
            label={saving ? 'Сохранение…' : 'Сохранить'}
            disabled={saving || testing}
            onPress={() => void save()}
          />
        </View>
      </View>
    </AppModal>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  placeholder,
  ...props
}: React.ComponentProps<typeof TextInput> & { placeholder: string }) {
  return (
    <TextInput
      {...props}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: sp(5) },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: sp(2) },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: sp(2) },
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
  section: {
    gap: sp(4),
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: sp(4),
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  actions: { gap: sp(3) },
  advanced: {
    gap: sp(4),
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: sp(4),
  },
});
