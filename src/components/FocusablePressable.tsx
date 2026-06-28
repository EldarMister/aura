import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

type PressableProps = React.ComponentProps<typeof Pressable>;
type FocusableState = {
  pressed: boolean;
  hovered?: boolean;
  focused: boolean;
};

type FocusableStyle = StyleProp<ViewStyle> | ((state: FocusableState) => StyleProp<ViewStyle>);

export type FocusablePressableProps = Omit<PressableProps, 'style'> & {
  style?: FocusableStyle;
};

export function FocusablePressable({
  style,
  onBlur,
  onFocus,
  ...props
}: FocusablePressableProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...props}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      style={
        typeof style === 'function'
          ? (state) => style({ ...state, focused })
          : style
      }
    />
  );
}
