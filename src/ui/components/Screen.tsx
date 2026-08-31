import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../ThemeProvider';

export function Screen({
  title,
  subtitle,
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
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
      // « padding » sur toutes les plateformes, Android compris. Y passer
      // `undefined` s'en remettait au redimensionnement de fenêtre demandé par
      // `android:windowSoftInputMode="adjustResize"` ; depuis Android 15 le
      // bord-à-bord est imposé et ce redimensionnement n'a plus lieu, si bien
      // que le clavier recouvrait le pied de page et le dernier champ sans
      // qu'aucun défilement puisse les dégager.
      //
      // Le déplacement se calcule par l'empiètement réellement mesuré à
      // l'écran, donc là où la fenêtre est encore redimensionnée l'empiètement
      // vaut zéro : pas de double compensation.
      behavior="padding"
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingTop: insets.top + theme.spacing.lg,
        }}
      >
        {body}
      </ScrollView>

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
