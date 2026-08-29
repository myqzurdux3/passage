import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeContext } from '../ThemeProvider';

export function Card({ children }: { children: ReactNode }) {
  const theme = useThemeContext();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
