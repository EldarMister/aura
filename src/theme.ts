import { Platform, ViewStyle } from 'react-native';

/**
 * Дизайн-токены. Значения подобраны под референсы из /дизайн:
 * белый фон, тёмный почти чёрный текст, зелёный акцент, тонкие линии.
 */
export const colors = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E9EAEC', // тонкие линии / контур карточек
  divider: '#F0F1F2', // разделители строк внутри карточек
  text: '#16181D', // основной тёмный текст
  textMuted: '#8A9099', // серые подписи
  green: '#0A9D4B', // основной зелёный акцент
  greenDark: '#04973E',
  greenSoft: '#EAF7EF',
  blue: '#0A52FF', // синяя ссылка («Смотреть все»)
  amber: '#E6A700', // предупреждение по таймеру (≥70% времени)
  danger: '#E5484D', // тревога по таймеру (≥90%) / время вышло
  white: '#FFFFFF',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

/** Сетка 4pt. */
export const sp = (n: number) => n * 4;

export const shadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 1 },
    default: {},
  }) ?? {};
