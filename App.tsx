import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initSync } from '@/lib/sync';
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
