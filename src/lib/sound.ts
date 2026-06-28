import { Audio } from 'expo-av';

/**
 * Озвучка «время вышло» по столам. Файлы лежат в assets/sounds/.
 * Чтобы добавить стол — просто дополни массив.
 */
const FILES = [
  require('../../assets/sounds/table1.wav'),
  require('../../assets/sounds/table2.wav'),
];

let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    audioModeReady = true;
  } catch {
    // не критично — продолжаем
  }
}

/** Проиграть звук «время вышло» для стола по его индексу (0 — Стол 1, 1 — Стол 2). */
export async function playTableTimeUp(index: number): Promise<void> {
  if (index < 0 || index >= FILES.length) return;
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(FILES[index]);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => undefined);
      }
    });
  } catch {
    // нет файла / ошибка воспроизведения — тихо игнорируем
  }
}
