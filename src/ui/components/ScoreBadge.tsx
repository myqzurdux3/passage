import { StyleSheet, Text, View } from 'react-native';
import { useThemeContext } from '../ThemeProvider';

const GOOD = 8;
const FAIR = 5;

export function ScoreBadge({ score }: { score: number | null }) {
  const theme = useThemeContext();

  if (score === null) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.colors.border }]}>
        <Text style={[styles.text, { color: theme.colors.textMuted }]}>—</Text>
      </View>
    );
  }

  const { background, foreground } = tint(score, theme.colors);

  return (
    <View
      accessibilityLabel={`Note : ${score} sur 10`}
      style={[styles.badge, { backgroundColor: background }]}
    >
      <Text style={[styles.text, { color: foreground }]}>{score}/10</Text>
    </View>
  );
}

function tint(
  score: number,
  colors: {
    success: string;
    successSoft: string;
    accent: string;
    accentSoft: string;
    error: string;
    errorSoft: string;
  },
) {
  if (score >= GOOD) return { background: colors.successSoft, foreground: colors.success };
  if (score >= FAIR) return { background: colors.accentSoft, foreground: colors.accent };
  return { background: colors.errorSoft, foreground: colors.error };
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 13, fontWeight: '600' },
});
