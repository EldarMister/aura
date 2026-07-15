import React from 'react';
import { Text, TextStyle } from 'react-native';

import { GameSession } from '@/types';
import { clock } from '@/utils/format';
import { elapsedSeconds } from '@/utils/session';

export function ElapsedText({
  session,
  now,
  style,
  fit = false,
}: {
  session: GameSession;
  now: number;
  style?: TextStyle | TextStyle[];
  fit?: boolean;
}) {
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit={fit} style={style}>
      {clock(elapsedSeconds(session, now))}
    </Text>
  );
}
