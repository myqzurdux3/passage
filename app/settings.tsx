import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { makeAiClient } from '../src/ai/claude';
import { AppError } from '../src/ai/errors';
import { BASE_LEVELS, LEVEL_LABELS_FR } from '../src/core/levels';
import { parseReminderHour } from '../src/usecases/reminders';
import { useApp } from '../src/ui/AppProvider';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { Screen } from '../src/ui/components/Screen';
import { SelectableOption } from '../src/ui/components/SelectableOption';
import { TextField } from '../src/ui/components/TextField';
import { useThemeContext } from '../src/ui/ThemeProvider';
import type { ThemePreference } from '../src/ui/theme';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

export default function SettingsScreen() {
  const theme = useThemeContext();
  const router = useRouter();
  const { settings, updateSettings, saveApiKey, eraseEverything } = useApp();

  const [newKey, setNewKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [hour, setHour] = useState(
    settings.reminderHour === null ? '' : String(settings.reminderHour),
  );

  /** La clé est éprouvée avant d'être gardée, comme à l'amorçage : une clé
   *  fautive enregistrée en silence ne se découvrirait que le lendemain. */
  const replaceKey = async () => {
    if (newKey.trim().length === 0) return;
    setChecking(true);
    try {
      await makeAiClient(newKey.trim()).generateSeries({
        level: 'A2',
        weakTags: [],
        recentSources: [],
      });
      await saveApiKey(newKey);
      setNewKey('');
      Alert.alert('Clé remplacée', 'La nouvelle clé est vérifiée et enregistrée.');
    } catch (e) {
      Alert.alert(
        'Clé refusée',
        e instanceof AppError ? e.message : "La clé n'a pas pu être vérifiée.",
      );
    } finally {
      setChecking(false);
    }
  };

  const confirmErase = () => {
    Alert.alert(
      'Tout effacer',
      'Séries, corrections, historique et clé API seront supprimés définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: () => {
            void eraseEverything();
          },
        },
      ],
    );
  };

  return (
    <Screen
      title="Réglages"
      footer={<Button label="Retour" variant="secondary" onPress={() => router.replace('/')} />}
    >
      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Niveau de base</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Plancher de référence. L’adaptatif ne dévie que d’un cran.
        </Text>
        {BASE_LEVELS.map((candidate) => (
          <SelectableOption
            key={candidate}
            label={LEVEL_LABELS_FR[candidate]}
            selected={settings.baseLevel === candidate}
            onPress={() => updateSettings({ baseLevel: candidate })}
          />
        ))}
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Apparence</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {(['system', 'light', 'dark'] as const).map((candidate) => (
            <SelectableOption
              key={candidate}
              selected={settings.theme === candidate}
              onPress={() => updateSettings({ theme: candidate })}
              style={{ flex: 1 }}
            >
              <Text
                style={[
                  theme.type.label,
                  {
                    textAlign: 'center',
                    color: settings.theme === candidate ? theme.colors.accent : theme.colors.text,
                  },
                ]}
              >
                {THEME_LABELS[candidate]}
              </Text>
            </SelectableOption>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Rappel quotidien</Text>
        <TextField
          accessibilityLabel="Heure du rappel"
          placeholder="Aucun rappel"
          value={hour}
          onChangeText={(text) => {
            setHour(text);
            updateSettings({ reminderHour: parseReminderHour(text) });
          }}
          keyboardType="number-pad"
          maxLength={2}
        />
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Clé API</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Enregistrée dans le coffre-fort du téléphone. Elle n’est jamais affichée.
        </Text>
        <TextField
          accessibilityLabel="Nouvelle clé API"
          placeholder="Remplacer par une nouvelle clé"
          value={newKey}
          onChangeText={setNewKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Button
          label={checking ? 'Vérification…' : 'Vérifier et remplacer la clé'}
          variant="secondary"
          onPress={() => void replaceKey()}
          disabled={newKey.trim().length === 0}
          busy={checking}
        />
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.error }]}>Zone dangereuse</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Efface les séries, les corrections, l’historique et la clé API. Irréversible.
        </Text>
        <Button label="Tout effacer" variant="secondary" onPress={confirmErase} />
      </Card>
    </Screen>
  );
}


