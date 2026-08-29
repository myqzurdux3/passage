import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { localDay } from '../src/core/date';
import { TAG_LABELS_FR, topWeakTags } from '../src/core/errorTags';
import { averageScore, formatStreak, scoreBand } from '../src/core/scores';
import { currentStreak } from '../src/core/streak';
import { useApp, useDeps } from '../src/ui/AppProvider';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { Screen } from '../src/ui/components/Screen';
import { useThemeContext } from '../src/ui/ThemeProvider';

export default function History() {
  const { deps } = useApp();
  if (!deps) return null;
  return <HistoryReady />;
}

function HistoryReady() {
  const deps = useDeps();
  const theme = useThemeContext();
  const router = useRouter();

  const scores = useMemo(() => deps.stats.dailyScores(), [deps]);
  const streak = useMemo(
    () => currentStreak(deps.stats.correctedDays(), localDay(deps.now())),
    [deps],
  );
  const weakTags = useMemo(() => topWeakTags(deps.stats.recentTagsBySeries(10)), [deps]);

  const overall = averageScore(scores.map((s) => s.average));

  return (
    <Screen
      title="Historique"
      subtitle={
        scores.length > 0
          ? `${scores.length} série${scores.length > 1 ? 's' : ''} · ${formatStreak(streak)}`
          : 'Rien encore. La première série arrive.'
      }
      footer={<Button label="Retour" variant="secondary" onPress={() => router.replace('/')} />}
    >
      {scores.length > 0 ? (
        <>
          <Card>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
              Moyenne générale
            </Text>
            <Text
              style={[
                theme.type.title,
                { color: theme.colors.text, fontFamily: theme.fonts.serif },
              ]}
            >
              {overall} / 10
            </Text>
          </Card>

          <Card>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Par jour</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {scores.map((entry) => (
                <Pressable
                  key={entry.day}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.day}, moyenne ${entry.average} sur 10`}
                  onPress={() => router.push(`/correction/${entry.day}`)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: theme.radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tint(entry.average, theme.colors),
                  }}
                >
                  <Text style={[theme.type.caption, { color: theme.colors.text }]}>
                    {entry.day.slice(8)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {weakTags.length > 0 ? (
        <Card>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            Ce qui revient le plus
          </Text>
          {weakTags.map((tag) => (
            <Text key={tag} style={[theme.type.body, { color: theme.colors.text }]}>
              · {TAG_LABELS_FR[tag]}
            </Text>
          ))}
        </Card>
      ) : null}

      <Pressable onPress={() => router.push('/settings')}>
        <Text style={[theme.type.label, { color: theme.colors.accent, textAlign: 'center' }]}>
          Réglages
        </Text>
      </Pressable>
    </Screen>
  );
}

function tint(
  average: number,
  colors: { successSoft: string; accentSoft: string; errorSoft: string },
): string {
  switch (scoreBand(average)) {
    case 'good':
      return colors.successSoft;
    case 'fair':
      return colors.accentSoft;
    default:
      return colors.errorSoft;
  }
}
