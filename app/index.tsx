import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppError } from '../src/ai/errors';
import { averageScore, formatStreak } from '../src/core/scores';
import { getTodaySeries } from '../src/usecases/getTodaySeries';
import { submitAnswers } from '../src/usecases/submitAnswers';
import type { StoredSeries } from '../src/data/seriesRepository';
import { useApp, useDeps } from '../src/ui/AppProvider';
import { useRefreshOnFocus } from '../src/ui/useRefreshOnFocus';
import { useStreak } from '../src/ui/useStreak';
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
  // Le vidage des saisies en attente a besoin de la série courante depuis un
  // rappel posé une seule fois ; la copie se fait dans un effet, pas au rendu.
  const seriesRef = useRef<StoredSeries | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  // Un minuteur par champ : un seul minuteur partagé annulait la sauvegarde
  // du champ précédent dès qu'on passait au suivant.
  const saveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingSaves = useRef(new Map<number, string>());

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
  }, [deps]);

  const flushPendingSaves = useCallback(() => {
    const timers = saveTimers.current;
    const pending = pendingSaves.current;
    if (pending.size === 0) return;

    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();

    const answers = [...pending.entries()].map(([position, user_en]) => ({ position, user_en }));
    pending.clear();
    if (seriesRef.current) deps.series.saveAnswers(seriesRef.current.id, answers);
  }, [deps]);

  // Quitter l'écran écrit ce qui restait en attente, au lieu de le jeter.
  useEffect(() => flushPendingSaves, [flushPendingSaves]);

  // Le rechargement est aussi déclenché au retour au premier plan : la série
  // affichée doit être celle du jour, pas celle d'hier soir. Le vidage préalable
  // évite qu'une relecture écrase une frappe encore en attente.
  useRefreshOnFocus(
    useCallback(() => {
      void load();
    }, [load]),
    { beforeLeave: flushPendingSaves },
  );

  const onChange = (position: number, value: string) => {
    setDrafts((current) => ({ ...current, [position]: value }));
    if (!series) return;

    pendingSaves.current.set(position, value);

    const existing = saveTimers.current.get(position);
    if (existing) clearTimeout(existing);

    saveTimers.current.set(
      position,
      setTimeout(() => {
        saveTimers.current.delete(position);
        pendingSaves.current.delete(position);
        deps.series.saveAnswers(series.id, [{ position, user_en: value }]);
      }, SAVE_DELAY_MS),
    );
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
            label={submitting ? 'Correction en cours…' : error ? 'Réessayer' : 'Corriger'}
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
  const theme = useThemeContext();
  const router = useRouter();

  const average = averageScore(series.sentences.map((s) => s.score));
  const streak = useStreak();

  return (
    <Screen title="C’est fait" subtitle="Reviens demain pour cinq nouvelles phrases.">
      <Card>
        <Text
          style={[theme.type.title, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}
        >
          {average ?? '—'} / 10
        </Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Moyenne du jour · {formatStreak(streak)}
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
        ? 'Pas de connexion — tes réponses sont gardées. Réessaie quand le réseau revient.'
        : error.message}
    </Text>
  );
}
