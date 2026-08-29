import { useState } from 'react';
import { Text, View } from 'react-native';
import { makeAiClient } from '../src/ai/claude';
import { parseReminderHour } from '../src/usecases/reminders';
import { AppError } from '../src/ai/errors';
import { BASE_LEVELS, LEVEL_LABELS_FR, type Level } from '../src/core/levels';
import { useApp } from '../src/ui/AppProvider';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { Screen } from '../src/ui/components/Screen';
import { SelectableOption } from '../src/ui/components/SelectableOption';
import { TextField } from '../src/ui/components/TextField';
import { Logo } from '../src/ui/Logo';
import { useThemeContext } from '../src/ui/ThemeProvider';

type Step = 'key' | 'level' | 'reminder';

export default function Onboarding() {
  const theme = useThemeContext();
  const { saveApiKey, updateSettings } = useApp();

  const [step, setStep] = useState<Step>('key');
  const [key, setKey] = useState('');
  const [level, setLevel] = useState<Level>('B1');
  const [hour, setHour] = useState('19');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** La clé est éprouvée avant d'être enregistrée : pas de clé morte en mémoire. */
  const validateKey = async () => {
    setChecking(true);
    setError(null);
    try {
      await makeAiClient(key.trim()).generateSeries({
        level: 'A2',
        weakTags: [],
        recentSources: [],
      });
      setStep('level');
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'La vérification a échoué.');
    } finally {
      setChecking(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      updateSettings({ baseLevel: level, reminderHour: parseReminderHour(hour) });
      await saveApiKey(key);
    } catch {
      setError("La clé n'a pas pu être enregistrée. Réessaie.");
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl }}>
        <Logo size={72} />
        <Text
          style={[theme.type.title, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}
        >
          Passage
        </Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted, textAlign: 'center' }]}>
          Cinq phrases à traduire chaque jour, corrigées une par une.
        </Text>
      </View>

      {step === 'key' ? (
        <Card>
          <Text style={[theme.type.heading, { color: theme.colors.text }]}>Ta clé API</Text>
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            Elle reste dans le coffre-fort du téléphone et ne quitte jamais l’appareil, sauf pour
            appeler l’API Anthropic.
          </Text>
          <TextField
            accessibilityLabel="Clé API Anthropic"
            placeholder="sk-ant-…"
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {error ? (
            <Text style={[theme.type.label, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
          <Button
            label={checking ? 'Vérification…' : 'Vérifier et continuer'}
            onPress={validateKey}
            disabled={key.trim().length === 0}
            busy={checking}
          />
        </Card>
      ) : null}

      {step === 'level' ? (
        <Card>
          <Text style={[theme.type.heading, { color: theme.colors.text }]}>Ton niveau de base</Text>
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            C’est un plancher : l’app ajuste d’un cran vers le haut ou vers le bas selon tes
            résultats, jamais plus.
          </Text>
          {BASE_LEVELS.map((candidate) => (
            <SelectableOption
              key={candidate}
              label={LEVEL_LABELS_FR[candidate]}
              selected={level === candidate}
              onPress={() => setLevel(candidate)}
            />
          ))}
          <Button label="Continuer" onPress={() => setStep('reminder')} />
        </Card>
      ) : null}

      {step === 'reminder' ? (
        <Card>
          <Text style={[theme.type.heading, { color: theme.colors.text }]}>Le rappel du jour</Text>
          <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
            À quelle heure veux-tu qu’on te le rappelle ? Laisse vide pour aucun rappel.
          </Text>
          <TextField
            accessibilityLabel="Heure du rappel"
            placeholder="19"
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            maxLength={2}
          />
          {error ? (
            <Text style={[theme.type.label, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
          <Button
            label={saving ? 'Enregistrement…' : 'Commencer'}
            onPress={() => void finish()}
            busy={saving}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

