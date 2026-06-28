import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initSync } from '@/lib/sync';
import { TimeUpSoundWatcher } from '@/components/TimeUpSoundWatcher';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { TablesScreen } from '@/screens/TablesScreen';
import { TvScreen } from '@/screens/TvScreen';
import { colors } from '@/theme';
import { useStore } from '@/store/useStore';

/** Ждём восстановления состояния из AsyncStorage, чтобы не было «прыжка» UI. */
function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const hydrated = useHydrated();
  // Шрифт иконок Feather вшит в сборку нативно (плагин expo-font, файл
  // assets/fonts/feather.ttf — имя в нижнем регистре, как требует
  // @expo/vector-icons на Android). Глифы доступны сразу, отдельная загрузка
  // через useFonts не нужна и раньше давала конфликт/белый экран.

  // Поднимаем синхронизацию после восстановления настроек связи.
  useEffect(() => {
    if (!hydrated) return;
    initSync();
    // устройство-табло сразу показывает экран ТВ
    if (useStore.getState().connection.role === 'display') {
      useStore.getState().go('tv');
    }
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {hydrated ? <TimeUpSoundWatcher /> : null}
        {!hydrated ? null : screen === 'tables' ? (
          <TablesScreen />
        ) : screen === 'settings' ? (
          <SettingsScreen />
        ) : screen === 'stats' ? (
          <StatsScreen />
        ) : (
          <TvScreen />
        )}
      </View>
    </SafeAreaProvider>
  );
}
