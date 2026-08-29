import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { localDay } from '../../src/core/date';
import { wordDiff } from '../../src/core/diff';
import { currentStreak } from '../../src/core/streak';
import { TAG_LABELS_FR } from '../../src/core/errorTags';
import type { StoredSentence } from '../../src/data/seriesRepository';
import { useApp, useDeps } from '../../src/ui/AppProvider';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { DiffText } from '../../src/ui/components/DiffText';
import { ScoreBadge } from '../../src/ui/components/ScoreBadge';
import { Screen } from '../../src/ui/components/Screen';
import { useThemeContext } from '../../src/ui/ThemeProvider';

export default function Correction() {
  const { deps } = useApp();
  if (!deps) return null;
  return <CorrectionReady />;
}

function CorrectionReady() {
  const deps = useDeps();
  const theme = useThemeContext();
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day: string }>();

  const series = useMemo(() => (day ? deps.series.findByDay(day) : null), [deps, day]);
  const streak = useMemo(
    () => currentStreak(deps.stats.correctedDays(), localDay(deps.now())),
    [deps],
  );

  if (!series) {
    return (
      <Screen title="Correction">
        <Card>
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            Aucune série pour ce jour.
          </Text>
          <Button label="Retour" variant="secondary" onPress={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }

  const scored = series.sentences.filter((s) => s.score !== null);
  const average =
    scored.length > 0
      ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 10) / 10
      : null;

  return (
    <Screen
      title="Correction"
      subtitle={`${formatDay(series.day)} · niveau ${series.level}`}
      footer={
        <Button label="Retour" onPress={() => router.replace('/')} />
      }
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <ScoreBadge score={average === null ? null : Math.round(average)} />
          <Text style={[theme.type.body, { color: theme.colors.text }]}>
            Moyenne du jour {average ?? '—'} · {streak} jour{streak > 1 ? 's' : ''} d’affilée
          </Text>
        </View>
      </Card>

      {series.sentences.map((sentence) => (
        <SentenceCorrection key={sentence.position} sentence={sentence} />
      ))}
    </Screen>
  );
}

function SentenceCorrection({ sentence }: { sentence: StoredSentence }) {
  const theme = useThemeContext();
  const answer = sentence.user_en ?? '';
  const corrected = sentence.corrected_en ?? '';
  const ops = useMemo(() => wordDiff(answer, corrected), [answer, corrected]);
  const perfect = answer.trim().toLowerCase() === corrected.trim().toLowerCase();

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Phrase {sentence.position}
        </Text>
        <ScoreBadge score={sentence.score} />
      </View>

      <Text
        style={[theme.type.sentence, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}
      >
        {sentence.source_fr}
      </Text>

      {perfect ? (
        <Text style={[theme.type.body, { color: theme.colors.success }]}>{corrected}</Text>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          <DiffText ops={ops} />
          <Text style={[theme.type.body, { color: theme.colors.text }]}>{corrected}</Text>
        </View>
      )}

      {sentence.explanation ? (
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          {sentence.explanation}
        </Text>
      ) : null}

      {sentence.error_tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {sentence.error_tags.map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: theme.colors.accentSoft,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={[theme.type.caption, { color: theme.colors.accent }]}>
                {TAG_LABELS_FR[tag]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
