import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useThemeContext } from '../ThemeProvider';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
}) {
  const theme = useThemeContext();
  const inactive = disabled || busy;

  const background =
    variant === 'primary'
      ? inactive
        ? theme.colors.border
        : theme.colors.accent
      : 'transparent';

  const foreground =
    variant === 'primary'
      ? inactive
        ? theme.colors.textMuted
        : '#FFFFFF'
      : inactive
        ? theme.colors.textMuted
        : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderRadius: theme.radius.md,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '600' },
});
