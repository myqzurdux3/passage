import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../ThemeProvider';

export function Screen({
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const theme = useThemeContext();
  const insets = useSafeAreaInsets();

  const header =
    title || subtitle ? (
      <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
        {title ? (
          <Text
            style={[
              theme.type.title,
              { color: theme.colors.text, fontFamily: theme.fonts.serif },
            ]}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    ) : null;

  const body = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      {header}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.spacing.xl,
            paddingTop: insets.top + theme.spacing.lg,
          }}
        >
          {body}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            padding: theme.spacing.xl,
            paddingTop: insets.top + theme.spacing.lg,
          }}
        >
          {body}
        </View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              padding: theme.spacing.lg,
              paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
