import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useThemeContext } from '../ThemeProvider';

/**
 * Option d'une liste de choix (niveau, thème). Le style vivait en double, une
 * fois nommé dans les réglages et une fois recopié à l'amorçage.
 */
export function SelectableOption({
  label,
  selected,
  onPress,
  style,
  role = 'radio',
  children,
}: {
  label?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  role?: 'radio' | 'button';
  children?: ReactNode;
}) {
  const theme = useThemeContext();

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          padding: theme.spacing.md,
          borderRadius: theme.radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          backgroundColor: selected ? theme.colors.accentSoft : 'transparent',
        },
        style,
      ]}
    >
      {children ?? (
        <Text
          style={[theme.type.body, { color: selected ? theme.colors.accent : theme.colors.text }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
