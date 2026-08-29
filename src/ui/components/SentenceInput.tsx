import { StyleSheet, Text } from 'react-native';
import { useThemeContext } from '../ThemeProvider';
import { Card } from './Card';
import { TextField } from './TextField';

/** Large de deux ordres de grandeur au-delà d'une traduction plausible. */
export const MAX_ANSWER_LENGTH = 600;

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
    <Card>
      <Text style={[styles.position, { color: theme.colors.textMuted }]}>
        {position} / {total}
      </Text>

      <Text
        style={[theme.type.sentence, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}
      >
        {sourceFr}
      </Text>

      <TextField
        accessibilityLabel={`Traduction de la phrase ${position}`}
        placeholder="Ta traduction en anglais"
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
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  position: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
});
