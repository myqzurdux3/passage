import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppError } from '../src/ai/errors';
import { localDay } from '../src/core/date';
import { currentStreak } from '../src/core/streak';
import { getTodaySeries } from '../src/usecases/getTodaySeries';
import { submitAnswers } from '../src/usecases/submitAnswers';
import type { StoredSeries } from '../src/data/seriesRepository';
import { useApp, useDeps } from '../src/ui/AppProvider';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { Screen } from '../src/ui/components/Screen';
import { SentenceInput } from '../src/ui/components/SentenceInput';
import { useThemeContext } from '../src/ui/ThemeProvider';

const SAVE_DELAY_MS = 800;

export default function Today() {
  const { deps: maybeDeps } = useApp();
  if (!maybeDeps) return null;
  return <TodayReady />;
}

function TodayReady() {
  const deps = useDeps();
  const theme = useThemeContext();
  const router = useRouter();

  const [series, setSeries] = useState<StoredSeries | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = await getTodaySeries(deps);
      setSeries(today);
      setDrafts(
        Object.fromEntries(today.sentences.map((s) => [s.position, s.user_en ?? ''])),
      );
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('api_error'));
    } finally {
      setLoading(false);
    }
  }, [deps, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // La saisie survit à une fermeture : elle est écrite en base après une pause.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const onChange = (position: number, value: string) => {
    setDrafts((current) => ({ ...current, [position]: value }));
    if (!series) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      deps.series.saveAnswers(series.id, [{ position, user_en: value }]);
    }, SAVE_DELAY_MS);
  };

  const complete =
    series !== null && series.sentences.every((s) => (drafts[s.position] ?? '').trim().length > 0);

  const onSubmit = async () => {
    if (!series) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitAnswers(
        deps,
        series.id,
        series.sentences.map((s) => ({
          position: s.position,
          user_en: (drafts[s.position] ?? '').trim(),
        })),
      );
      router.replace(`/correction/${series.day}`);
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('api_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingVertical: 80 }}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            Préparation de tes phrases…
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !series) {
    return (
      <Screen title="Passage">
        <ErrorCard error={error} onRetry={load} />
      </Screen>
    );
  }

  if (!series) return null;

  // Série déjà corrigée : on n'a plus rien à saisir. Rediriger vers la
  // correction enfermerait l'utilisateur — elle-même renvoie ici.
  if (series.status === 'corrected') return <DoneToday series={series} />;

  return (
    <Screen
      title="Aujourd’hui"
      subtitle={`Cinq phrases à traduire · niveau ${series.level}`}
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {error ? <ErrorLine error={error} /> : null}
          <Button
            label={submitting ? 'Correction en cours…' : 'Corriger'}
            onPress={onSubmit}
            disabled={!complete}
            busy={submitting}
          />
        </View>
      }
    >
      <View style={{ gap: theme.spacing.lg }}>
        {series.sentences.map((sentence) => (
          <SentenceInput
            key={sentence.position}
            position={sentence.position}
            total={series.sentences.length}
            sourceFr={sentence.source_fr}
            value={drafts[sentence.position] ?? ''}
            onChange={(value) => onChange(sentence.position, value)}
            editable={!submitting}
          />
        ))}

        <Pressable onPress={() => router.push('/history')}>
          <Text style={[theme.type.label, { color: theme.colors.accent, textAlign: 'center' }]}>
            Voir l’historique
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function DoneToday({ series }: { series: StoredSeries }) {
  const deps = useDeps();
  const theme = useThemeContext();
  const router = useRouter();

  const scored = series.sentences.filter((s) => s.score !== null);
  const average =
    scored.length > 0
      ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 10) / 10
      : null;
  const streak = currentStreak(deps.stats.correctedDays(), localDay(deps.now()));

  return (
    <Screen title="C’est fait" subtitle="Reviens demain pour cinq nouvelles phrases.">
      <Card>
        <Text
          style={[theme.type.title, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}
        >
          {average ?? '—'} / 10
        </Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Moyenne du jour · {streak} jour{streak > 1 ? 's' : ''} d’affilée
        </Text>
      </Card>

      <Button
        label="Revoir la correction"
        onPress={() => router.push(`/correction/${series.day}`)}
      />
      <Button
        label="Historique"
        variant="secondary"
        onPress={() => router.push('/history')}
      />
    </Screen>
  );
}

function ErrorCard({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  const theme = useThemeContext();
  const router = useRouter();

  return (
    <Card>
      <Text style={[theme.type.heading, { color: theme.colors.text }]}>Impossible de charger</Text>
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{error.message}</Text>
      <Button label="Réessayer" onPress={onRetry} />
      {error.kind === 'invalid_key' ? (
        <Button
          label="Ouvrir les réglages"
          variant="secondary"
          onPress={() => router.push('/settings')}
        />
      ) : null}
    </Card>
  );
}

function ErrorLine({ error }: { error: AppError }) {
  const theme = useThemeContext();
  return (
    <Text style={[theme.type.label, { color: theme.colors.error, textAlign: 'center' }]}>
      {error.kind === 'offline'
        ? 'Pas de connexion — tes réponses sont gardées, la correction reprendra plus tard.'
        : error.message}
    </Text>
  );
}
