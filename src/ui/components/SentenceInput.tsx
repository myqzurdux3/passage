import { StyleSheet, Text, TextInput, View } from 'react-native';

/** Large de deux ordres de grandeur au-delà d'une traduction plausible. */
export const MAX_ANSWER_LENGTH = 600;
import { useThemeContext } from '../ThemeProvider';

export function SentenceInput({
  position,
  total,
  sourceFr,
  value,
  onChange,
  editable = true,
}: {
  position: number;
  total: number;
  sourceFr: string;
  value: string;
  onChange: (next: string) => void;
  editable?: boolean;
}) {
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
      <Text style={[styles.position, { color: theme.colors.textMuted }]}>
        {position} / {total}
      </Text>

      <Text
        style={[
          theme.type.sentence,
          { color: theme.colors.text, fontFamily: theme.fonts.serif },
        ]}
      >
        {sourceFr}
      </Text>

      <TextInput
        accessibilityLabel={`Traduction de la phrase ${position}`}
        placeholder="Ta traduction en anglais"
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline
        // Une réponse démesurée ferait dépasser la fenêtre de contexte à la
        // correction, et l'échec se répéterait à chaque reprise.
        maxLength={MAX_ANSWER_LENGTH}
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.background,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  position: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  input: {
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});
