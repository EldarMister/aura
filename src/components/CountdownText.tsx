import React from 'react';
import { Animated, TextStyle } from 'react-native';

import { useBlink } from '@/hooks/useBlink';
import { colors } from '@/theme';
import { GameSession } from '@/types';
import { clock } from '@/utils/format';
import { remainingSeconds, shouldBlink, timerLevel } from '@/utils/session';

/**
 * Текст обратного отсчёта с цветом по уровню тревоги и миганием на последней
 * минуте. baseColor — цвет в обычном состоянии (зависит от экрана).
 */
export function CountdownText({
  session,
  now,
  style,
  baseColor = colors.text,
  fit = false,
}: {
  session: GameSession;
  now: number;
  style?: TextStyle | TextStyle[];
  baseColor?: string;
  fit?: boolean;
}) {
  const level = timerLevel(session, now);
  const blink = shouldBlink(session, now);
  const opacity = useBlink(blink);

  // Последняя минута всегда красная (даже если по проценту это ещё не «danger»).
  const color =
    blink || level === 'danger'
      ? colors.danger
      : level === 'warn'
        ? colors.amber
        : baseColor;

  return (
    <Animated.Text
      numberOfLines={1}
      adjustsFontSizeToFit={fit}
      style={[style as TextStyle, { color, opacity }]}
    >
      {clock(remainingSeconds(session, now))}
    </Animated.Text>
  );
}
